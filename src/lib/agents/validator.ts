import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ValidationResult {
  topics: {
    topicName: string;
    description: string;
    score: number;
    postIds: string[];
    avgViews: number;
    avgER: number;
    avgComments: number;
    cluster: string;
  }[];
  filteredCount: number;
  totalAnalyzed: number;
}

// Scoring weights (default, can be overridden by ML feedback)
const DEFAULT_WEIGHTS = {
  views: 0.40,
  engagementRate: 0.35,
  comments: 0.25,
};

function calculateScore(
  normalizedViews: number,
  engagementRate: number,
  normalizedComments: number,
  weights = DEFAULT_WEIGHTS
): number {
  return (
    normalizedViews * weights.views +
    engagementRate * weights.engagementRate +
    normalizedComments * weights.comments
  );
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

export async function runValidator(scrapeJobId: string) {
  // Fetch all posts for this scrape job
  const posts = await prisma.scrapedPost.findMany({
    where: { scrapeJobId },
  });

  if (posts.length === 0) {
    throw new Error("No posts found for this scrape job");
  }

  // Step 1: Filter outliers (< 10k views or < 2% ER)
  const filteredPosts = posts.filter(
    (post) => post.views >= 10000 && post.engagementRate >= 2.0
  );

  const filteredCount = posts.length - filteredPosts.length;

  if (filteredPosts.length === 0) {
    // If all posts are filtered, lower thresholds
    const relaxedPosts = posts.filter(
      (post) => post.views >= 1000 && post.engagementRate >= 1.0
    );
    if (relaxedPosts.length > 0) {
      return await clusterAndScore(relaxedPosts, scrapeJobId, filteredCount, posts.length);
    }
    // Fallback: use all posts
    return await clusterAndScore(posts, scrapeJobId, 0, posts.length);
  }

  return await clusterAndScore(filteredPosts, scrapeJobId, filteredCount, posts.length);
}

async function clusterAndScore(
  posts: Array<{
    id: string;
    hookText: string | null;
    caption: string | null;
    views: number;
    likes: number;
    comments: number;
    engagementRate: number;
    transcript: string | null;
  }>,
  scrapeJobId: string,
  filteredCount: number,
  totalAnalyzed: number
): Promise<ValidationResult> {
  // Calculate normalization bounds
  const viewValues = posts.map((p) => p.views);
  const commentValues = posts.map((p) => p.comments);
  const minViews = Math.min(...viewValues);
  const maxViews = Math.max(...viewValues);
  const minComments = Math.min(...commentValues);
  const maxComments = Math.max(...commentValues);

  // Score each post
  const scoredPosts = posts.map((post) => ({
    ...post,
    normalizedScore: calculateScore(
      normalize(post.views, minViews, maxViews),
      normalize(post.engagementRate, 0, 15), // ER normalized against 15% max
      normalize(post.comments, minComments, maxComments)
    ),
  }));

  // Prepare post summaries for Claude clustering
  const postSummaries = scoredPosts.map((p) => ({
    id: p.id,
    hook: p.hookText || "",
    caption: (p.caption || "").substring(0, 300),
    score: Math.round(p.normalizedScore * 100),
    views: p.views,
    er: p.engagementRate,
    comments: p.comments,
  }));

  // Use Claude to semantically cluster posts into topics
  let clusters: Array<{
    topicName: string;
    description: string;
    cluster: string;
    postIds: string[];
  }>;

  try {
    const clusterResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Analyze these scraped social media posts and group them into 3-7 distinct topic clusters based on their content themes.

Posts:
${JSON.stringify(postSummaries, null, 2)}

Respond in this exact JSON format (no other text):
{
  "clusters": [
    {
      "topicName": "Short descriptive topic name",
      "description": "1-2 sentence description of this content theme",
      "cluster": "keyword_tag",
      "postIds": ["id1", "id2"]
    }
  ]
}`,
        },
      ],
    });

    const responseText = clusterResponse.content[0].type === "text" 
      ? clusterResponse.content[0].text 
      : "";
    
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Claude response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    clusters = parsed.clusters;
  } catch (error) {
    console.error("Claude clustering failed, using fallback:", error);
    // Fallback: group all posts into one topic
    clusters = [
      {
        topicName: "Trending Content",
        description: "High-performing content from the scraped results",
        cluster: "trending",
        postIds: scoredPosts.map((p) => p.id),
      },
    ];
  }

  // Calculate aggregate scores per cluster
  const topics = clusters.map((cluster) => {
    const clusterPosts = scoredPosts.filter((p) =>
      cluster.postIds.includes(p.id)
    );
    
    const avgViews = clusterPosts.reduce((sum, p) => sum + p.views, 0) / (clusterPosts.length || 1);
    const avgER = clusterPosts.reduce((sum, p) => sum + p.engagementRate, 0) / (clusterPosts.length || 1);
    const avgComments = clusterPosts.reduce((sum, p) => sum + p.comments, 0) / (clusterPosts.length || 1);
    const aggregateScore = clusterPosts.reduce((sum, p) => sum + p.normalizedScore, 0) / (clusterPosts.length || 1);

    return {
      topicName: cluster.topicName,
      description: cluster.description,
      score: Math.round(aggregateScore * 100) / 100,
      postIds: cluster.postIds,
      avgViews: Math.round(avgViews),
      avgER: Math.round(avgER * 100) / 100,
      avgComments: Math.round(avgComments),
      cluster: cluster.cluster,
    };
  });

  // Sort by score descending
  topics.sort((a, b) => b.score - a.score);

  // Store validated topics in database
  for (const topic of topics) {
    const created = await prisma.validatedTopic.create({
      data: {
        scrapeJobId,
        topicName: topic.topicName,
        description: topic.description,
        score: topic.score,
        cluster: topic.cluster,
        postCount: topic.postIds.length,
        avgViews: topic.avgViews,
        avgER: topic.avgER,
        avgComments: topic.avgComments,
      },
    });

    // Link posts to topic
    await Promise.all(
      topic.postIds.map((postId) =>
        prisma.validatedTopicPost.create({
          data: {
            topicId: created.id,
            postId,
          },
        }).catch(() => {
          // Skip if post ID doesn't exist (from Claude hallucination)
        })
      )
    );
  }

  return { topics, filteredCount, totalAnalyzed };
}

// Mock validator for development without Claude API
export async function runMockValidator(scrapeJobId: string) {
  const posts = await prisma.scrapedPost.findMany({
    where: { scrapeJobId },
  });

  const mockTopics = [
    {
      topicName: "Growth Hacking Strategies",
      description: "Content about rapid audience growth techniques and unconventional marketing tactics",
      cluster: "growth",
    },
    {
      topicName: "Content Creation Frameworks",
      description: "Systematic approaches to creating consistent, high-performing content",
      cluster: "frameworks",
    },
    {
      topicName: "Platform Algorithm Insights",
      description: "Data-backed analysis of what social media algorithms reward",
      cluster: "algorithms",
    },
    {
      topicName: "Revenue & Monetization",
      description: "Strategies for converting audience attention into revenue",
      cluster: "monetization",
    },
  ];

  const postsPerTopic = Math.ceil(posts.length / mockTopics.length);

  const topics = mockTopics.map((topic, i) => {
    const topicPosts = posts.slice(i * postsPerTopic, (i + 1) * postsPerTopic);
    const avgViews = topicPosts.reduce((s, p) => s + p.views, 0) / (topicPosts.length || 1);
    const avgER = topicPosts.reduce((s, p) => s + p.engagementRate, 0) / (topicPosts.length || 1);
    const avgComments = topicPosts.reduce((s, p) => s + p.comments, 0) / (topicPosts.length || 1);

    return {
      ...topic,
      score: Math.round((1 - i * 0.15) * 100) / 100,
      postIds: topicPosts.map((p) => p.id),
      avgViews: Math.round(avgViews),
      avgER: Math.round(avgER * 100) / 100,
      avgComments: Math.round(avgComments),
      postCount: topicPosts.length,
    };
  });

  for (const topic of topics) {
    const created = await prisma.validatedTopic.create({
      data: {
        scrapeJobId,
        topicName: topic.topicName,
        description: topic.description,
        score: topic.score,
        cluster: topic.cluster,
        postCount: topic.postCount,
        avgViews: topic.avgViews,
        avgER: topic.avgER,
        avgComments: topic.avgComments,
      },
    });

    await Promise.all(
      topic.postIds.map((postId) =>
        prisma.validatedTopicPost.create({
          data: { topicId: created.id, postId },
        }).catch(() => {})
      )
    );
  }

  return {
    topics,
    filteredCount: 0,
    totalAnalyzed: posts.length,
  };
}
