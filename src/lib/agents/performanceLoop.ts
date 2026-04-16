import { prisma } from "../prisma";

interface PerformanceInput {
  scriptId: string;
  actualViews: number;
  actualER: number;
  actualComments: number;
  actualLikes: number;
  platform: string;
  postUrl?: string;
}

// Log actual post performance
export async function logPerformance(input: PerformanceInput) {
  const existing = await prisma.performanceLog.findUnique({
    where: { scriptId: input.scriptId },
  });

  if (existing) {
    return prisma.performanceLog.update({
      where: { scriptId: input.scriptId },
      data: {
        actualViews: input.actualViews,
        actualER: input.actualER,
        actualComments: input.actualComments,
        actualLikes: input.actualLikes,
        platform: input.platform,
        postUrl: input.postUrl,
        postedAt: new Date(),
      },
    });
  }

  // Update script status to "posted"
  await prisma.generatedScript.update({
    where: { id: input.scriptId },
    data: { status: "posted" },
  });

  return prisma.performanceLog.create({
    data: {
      scriptId: input.scriptId,
      actualViews: input.actualViews,
      actualER: input.actualER,
      actualComments: input.actualComments,
      actualLikes: input.actualLikes,
      platform: input.platform,
      postUrl: input.postUrl,
      postedAt: new Date(),
    },
  });
}

// Analyze performance data and adjust scoring weights
export async function recalibrateWeights() {
  // Get all scripts that have performance data
  const performanceLogs = await prisma.performanceLog.findMany({
    include: {
      script: {
        include: {
          topic: {
            include: {
              posts: {
                include: { post: true },
              },
            },
          },
        },
      },
    },
  });

  if (performanceLogs.length < 3) {
    return {
      message: "Need at least 3 performance logs to recalibrate",
      currentWeights: { views: 0.40, er: 0.35, comments: 0.25 },
      sampleSize: performanceLogs.length,
    };
  }

  // Compare predicted scores with actual performance
  // Predicted: the topic score that led to script generation
  // Actual: how well the posted content actually performed

  const dataPoints = performanceLogs.map((log) => {
    const topicScore = log.script.topic.score;
    const topicAvgViews = log.script.topic.avgViews;
    const topicAvgER = log.script.topic.avgER;
    const topicAvgComments = log.script.topic.avgComments;

    // Normalize actual performance relative to predictions
    const viewsRatio = topicAvgViews > 0 ? log.actualViews / topicAvgViews : 0;
    const erRatio = topicAvgER > 0 ? log.actualER / topicAvgER : 0;
    const commentsRatio = topicAvgComments > 0 ? log.actualComments / topicAvgComments : 0;

    // Overall success metric (how close actual was to predicted)
    const actualSuccess = (viewsRatio + erRatio + commentsRatio) / 3;

    return {
      topicScore,
      viewsRatio,
      erRatio,
      commentsRatio,
      actualSuccess,
    };
  });

  // Calculate correlation between each metric and actual success
  const viewsCorr = calculateCorrelation(
    dataPoints.map((d) => d.viewsRatio),
    dataPoints.map((d) => d.actualSuccess)
  );
  const erCorr = calculateCorrelation(
    dataPoints.map((d) => d.erRatio),
    dataPoints.map((d) => d.actualSuccess)
  );
  const commentsCorr = calculateCorrelation(
    dataPoints.map((d) => d.commentsRatio),
    dataPoints.map((d) => d.actualSuccess)
  );

  // Normalize correlations to weights (ensure they sum to 1)
  const totalCorr = Math.abs(viewsCorr) + Math.abs(erCorr) + Math.abs(commentsCorr);
  
  const newWeights = {
    views: totalCorr > 0 ? Math.round((Math.abs(viewsCorr) / totalCorr) * 100) / 100 : 0.40,
    er: totalCorr > 0 ? Math.round((Math.abs(erCorr) / totalCorr) * 100) / 100 : 0.35,
    comments: totalCorr > 0 ? Math.round((Math.abs(commentsCorr) / totalCorr) * 100) / 100 : 0.25,
  };

  // Ensure weights sum to 1
  const sum = newWeights.views + newWeights.er + newWeights.comments;
  if (sum > 0) {
    newWeights.views = Math.round((newWeights.views / sum) * 100) / 100;
    newWeights.er = Math.round((newWeights.er / sum) * 100) / 100;
    newWeights.comments = Math.round((1 - newWeights.views - newWeights.er) * 100) / 100;
  }

  // Calculate accuracy score
  const avgAccuracy = dataPoints.reduce((sum, d) => {
    const predicted = d.topicScore;
    const actual = d.actualSuccess;
    return sum + (1 - Math.abs(predicted - actual));
  }, 0) / dataPoints.length;

  // Deactivate previous weights
  await prisma.scoringWeightHistory.updateMany({
    where: { isActive: true },
    data: { isActive: false },
  });

  // Store new weights
  const weightRecord = await prisma.scoringWeightHistory.create({
    data: {
      viewsWeight: newWeights.views,
      erWeight: newWeights.er,
      commentWeight: newWeights.comments,
      sampleSize: performanceLogs.length,
      avgAccuracy: Math.round(avgAccuracy * 100) / 100,
      isActive: true,
      notes: `Auto-calibrated from ${performanceLogs.length} performance logs. Views corr: ${viewsCorr.toFixed(3)}, ER corr: ${erCorr.toFixed(3)}, Comments corr: ${commentsCorr.toFixed(3)}`,
    },
  });

  return {
    newWeights,
    previousWeights: { views: 0.40, er: 0.35, comments: 0.25 },
    sampleSize: performanceLogs.length,
    avgAccuracy: Math.round(avgAccuracy * 100) / 100,
    correlations: {
      views: viewsCorr.toFixed(3),
      er: erCorr.toFixed(3),
      comments: commentsCorr.toFixed(3),
    },
    weightRecordId: weightRecord.id,
  };
}

// Get current active weights
export async function getActiveWeights() {
  const active = await prisma.scoringWeightHistory.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!active) {
    return {
      views: 0.40,
      er: 0.35,
      comments: 0.25,
      isDefault: true,
      sampleSize: 0,
      avgAccuracy: 0,
    };
  }

  return {
    views: active.viewsWeight,
    er: active.erWeight,
    comments: active.commentWeight,
    isDefault: false,
    sampleSize: active.sampleSize,
    avgAccuracy: active.avgAccuracy,
    calibratedAt: active.createdAt,
  };
}

// Get all weight history
export async function getWeightHistory() {
  return prisma.scoringWeightHistory.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

// Pearson correlation coefficient
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
  );

  return denominator === 0 ? 0 : numerator / denominator;
}
