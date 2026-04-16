import { prisma } from "../prisma";

// Simulated Gemini Vision analysis for multimodal video understanding
// In production, this would call the Gemini 1.5 Pro API with video frames

interface VideoAnalysisInput {
  postId: string;
  videoUrl?: string;
}

interface VisualHook {
  type: string;
  timestamp: string;
  description: string;
  impact: "high" | "medium" | "low";
}

interface PacingAnalysis {
  avgCutDuration: number;
  totalCuts: number;
  tempo: "fast" | "medium" | "slow";
  energyCurve: string;
}

export async function runVideoAnalysis(input: VideoAnalysisInput) {
  const { postId, videoUrl } = input;

  // In production, this would:
  // 1. Download/stream the video
  // 2. Extract key frames at intervals
  // 3. Send frames to Gemini 1.5 Pro for analysis
  // 4. Aggregate visual insights

  // For now, we simulate the analysis with smart mock data
  const post = await prisma.scrapedPost.findUnique({
    where: { id: postId },
  });

  if (!post) throw new Error("Post not found");

  const visualHooks: VisualHook[] = [
    {
      type: "text_overlay",
      timestamp: "0:00-0:02",
      description: "Bold white text on dark background — hook statement visible immediately",
      impact: "high",
    },
    {
      type: "fast_zoom",
      timestamp: "0:01",
      description: "Quick zoom-in on face/product creates urgency and grabs attention",
      impact: "high",
    },
    {
      type: "pattern_interrupt",
      timestamp: "0:03-0:05",
      description: "Unexpected visual transition (jump cut or whip pan) that disrupts scroll",
      impact: "medium",
    },
    {
      type: "b_roll_insert",
      timestamp: "0:08-0:12",
      description: "Supporting b-roll footage reinforcing the spoken content",
      impact: "medium",
    },
    {
      type: "motion_graphics",
      timestamp: "0:15-0:18",
      description: "Animated data visualization or chart appearing on screen",
      impact: "medium",
    },
  ];

  const pacing: PacingAnalysis = {
    avgCutDuration: 2.4,
    totalCuts: Math.floor(Math.random() * 15) + 8,
    tempo: post.views > 100000 ? "fast" : "medium",
    energyCurve: "high-start → dip at 0:10 → build to peak at 0:20 → CTA",
  };

  const transitions = [
    { type: "jump_cut", count: 8, effectiveness: "high" },
    { type: "whip_pan", count: 2, effectiveness: "high" },
    { type: "fade", count: 1, effectiveness: "low" },
    { type: "zoom_transition", count: 3, effectiveness: "medium" },
  ];

  const colorPalette = {
    dominant: ["#1a1a2e", "#16213e", "#0f3460"],
    accents: ["#e94560", "#ffdd40", "#53d8fb"],
    vibe: "Dark & contrasty — high visual impact",
  };

  const overallScore = Math.round((Math.random() * 30 + 70) * 10) / 10;

  const analysis = await prisma.videoAnalysis.create({
    data: {
      postId,
      videoUrl: videoUrl || post.url,
      visualHooks: JSON.stringify(visualHooks),
      pacing: JSON.stringify(pacing),
      textOnScreen: "Bold sans-serif, centered, appears in first 2 seconds",
      transitions: JSON.stringify(transitions),
      bRollStyle: "Cinematic lifestyle shots with shallow depth of field",
      colorPalette: JSON.stringify(colorPalette),
      thumbnailNotes: "High-contrast face thumbnail with text overlay — 7.2% CTR estimated",
      overallScore,
      rawAnalysis: JSON.stringify({
        visualHooks,
        pacing,
        transitions,
        colorPalette,
        scriptDirections: generateVisualDirections(visualHooks, pacing),
      }),
    },
  });

  return {
    id: analysis.id,
    postId,
    visualHooks,
    pacing,
    transitions,
    colorPalette,
    overallScore,
    textOnScreen: analysis.textOnScreen,
    bRollStyle: analysis.bRollStyle,
    thumbnailNotes: analysis.thumbnailNotes,
    scriptDirections: generateVisualDirections(visualHooks, pacing),
  };
}

// Generate shooting directions based on visual analysis
function generateVisualDirections(hooks: VisualHook[], pacing: PacingAnalysis): string[] {
  const directions: string[] = [];

  directions.push(`🎬 PACING: ${pacing.tempo.toUpperCase()} tempo — aim for ${pacing.avgCutDuration}s average cuts`);
  directions.push(`📈 ENERGY: ${pacing.energyCurve}`);

  for (const hook of hooks.filter((h) => h.impact === "high")) {
    switch (hook.type) {
      case "text_overlay":
        directions.push("📝 OPEN: Show your hook as bold text overlay in the first 2 seconds");
        break;
      case "fast_zoom":
        directions.push("🔍 CAMERA: Start with a fast zoom-in — creates immediate urgency");
        break;
      case "pattern_interrupt":
        directions.push("⚡ EDIT: Use a jump cut or whip pan within the first 5 seconds to disrupt the scroll");
        break;
    }
  }

  directions.push("🎨 COLORS: High contrast with dark backgrounds and bold accent colors");
  directions.push("📱 THUMBNAIL: Face + text overlay, centered composition, high contrast");

  return directions;
}

// Batch analyze multiple posts
export async function batchVideoAnalysis(postIds: string[]) {
  const results = [];
  for (const postId of postIds) {
    try {
      const result = await runVideoAnalysis({ postId });
      results.push(result);
    } catch (error) {
      console.error(`Video analysis failed for post ${postId}:`, error);
    }
  }
  return results;
}
