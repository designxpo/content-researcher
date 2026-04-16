import { ApifyClient } from "apify-client";
import OpenAI from "openai";
import { prisma } from "../prisma";

const apifyClient = new ApifyClient({
  token: process.env.APIFY_API_TOKEN || "",
});

const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "placeholder",
});

// Platform-specific Apify actor IDs
const ACTOR_IDS: Record<string, string> = {
  instagram: "apify/instagram-reel-scraper",
  youtube: "apify/youtube-scraper",
  twitter: "apify/twitter-scraper",
};

interface ScrapeInput {
  platform: string;
  query: string;
  maxItems?: number;
}

interface NormalizedPost {
  platform: string;
  url: string;
  hookText: string | null;
  caption: string | null;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number;
  postDate: Date | null;
  transcript: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
  authorHandle: string | null;
  rawData: string;
}

// Normalize different platform response schemas into a unified format
function normalizeInstagramPost(item: Record<string, unknown>): NormalizedPost {
  const views = (item.videoViewCount as number) || (item.likesCount as number) || 0;
  const likes = (item.likesCount as number) || 0;
  const comments = (item.commentsCount as number) || 0;
  const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
  const caption = (item.caption as string) || "";

  return {
    platform: "instagram",
    url: (item.url as string) || "",
    hookText: caption ? caption.split("\n")[0].substring(0, 200) : null,
    caption,
    views,
    likes,
    comments,
    engagementRate: Math.round(engagement * 100) / 100,
    postDate: item.timestamp ? new Date(item.timestamp as string) : null,
    transcript: null,
    thumbnailUrl: (item.displayUrl as string) || null,
    authorName: (item.ownerFullName as string) || null,
    authorHandle: (item.ownerUsername as string) || null,
    rawData: JSON.stringify(item),
  };
}

function normalizeYouTubePost(item: Record<string, unknown>): NormalizedPost {
  const views = (item.viewCount as number) || 0;
  const likes = (item.likes as number) || 0;
  const comments = (item.commentsCount as number) || (item.numberOfComments as number) || 0;
  const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
  const title = (item.title as string) || "";

  return {
    platform: "youtube",
    url: (item.url as string) || "",
    hookText: title.substring(0, 200),
    caption: (item.description as string) || title,
    views,
    likes,
    comments,
    engagementRate: Math.round(engagement * 100) / 100,
    postDate: item.date ? new Date(item.date as string) : null,
    transcript: (item.subtitles as string) || null,
    thumbnailUrl: (item.thumbnailUrl as string) || null,
    authorName: (item.channelName as string) || null,
    authorHandle: (item.channelUrl as string) || null,
    rawData: JSON.stringify(item),
  };
}

function normalizeTwitterPost(item: Record<string, unknown>): NormalizedPost {
  const views = (item.viewCount as number) || (item.retweetCount as number) || 0;
  const likes = (item.likeCount as number) || 0;
  const comments = (item.replyCount as number) || 0;
  const engagement = views > 0 ? ((likes + comments) / views) * 100 : 0;
  const text = (item.fullText as string) || (item.text as string) || "";

  return {
    platform: "twitter",
    url: (item.url as string) || "",
    hookText: text.substring(0, 200),
    caption: text,
    views,
    likes,
    comments,
    engagementRate: Math.round(engagement * 100) / 100,
    postDate: item.createdAt ? new Date(item.createdAt as string) : null,
    transcript: null,
    thumbnailUrl: null,
    authorName: (item.author as Record<string, unknown>)?.name as string || null,
    authorHandle: (item.author as Record<string, unknown>)?.userName as string || null,
    rawData: JSON.stringify(item),
  };
}

function normalizePost(platform: string, item: Record<string, unknown>): NormalizedPost {
  switch (platform) {
    case "instagram":
      return normalizeInstagramPost(item);
    case "youtube":
      return normalizeYouTubePost(item);
    case "twitter":
      return normalizeTwitterPost(item);
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

// Transcribe audio using OpenAI Whisper (placeholder for when video URLs are available)
async function transcribeAudio(audioUrl: string): Promise<string | null> {
  try {
    // In production, we'd download the video/audio file first
    // For now, we use the Whisper API with a direct file
    const response = await fetch(audioUrl);
    if (!response.ok) return null;
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const file = new File([buffer], "audio.mp4", { type: "video/mp4" });

    const transcription = await openaiClient.audio.transcriptions.create({
      file,
      model: "whisper-1",
    });

    return transcription.text;
  } catch (error) {
    console.error("Whisper transcription failed:", error);
    return null;
  }
}

// Main scraper function
export async function runScraper(input: ScrapeInput) {
  const { platform, query, maxItems = 50 } = input;

  // Create scrape job record
  const job = await prisma.scrapeJob.create({
    data: {
      platform,
      query,
      status: "running",
    },
  });

  try {
    const actorId = ACTOR_IDS[platform];
    if (!actorId) throw new Error(`No actor configured for platform: ${platform}`);

    // Build platform-specific input
    const actorInput = buildActorInput(platform, query, maxItems);

    // Run the Apify actor
    const run = await apifyClient.actor(actorId).call(actorInput);
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    // Normalize and store posts
    const posts: NormalizedPost[] = [];
    for (const item of items) {
      const normalized = normalizePost(platform, item as Record<string, unknown>);
      posts.push(normalized);
    }

    // Batch create posts in database
    const createdPosts = await Promise.all(
      posts.map((post) =>
        prisma.scrapedPost.create({
          data: {
            ...post,
            scrapeJobId: job.id,
          },
        })
      )
    );

    // Update job status
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        postsFound: createdPosts.length,
        completedAt: new Date(),
      },
    });

    return {
      jobId: job.id,
      postsFound: createdPosts.length,
      status: "completed",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await prisma.scrapeJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: errorMessage,
        completedAt: new Date(),
      },
    });
    throw error;
  }
}

function buildActorInput(platform: string, query: string, maxItems: number) {
  switch (platform) {
    case "instagram":
      return {
        search: query,
        resultsType: "posts",
        resultsLimit: maxItems,
        searchType: "hashtag",
      };
    case "youtube":
      return {
        searchKeywords: query,
        maxResults: maxItems,
        searchFilter: "shorts",
      };
    case "twitter":
      return {
        searchTerms: [query],
        maxTweets: maxItems,
        sort: "Top",
      };
    default:
      return { search: query, maxResults: maxItems };
  }
}

// Demo/mock scraper for development without API keys
export async function runMockScraper(input: ScrapeInput) {
  const { platform, query } = input;

  const job = await prisma.scrapeJob.create({
    data: {
      platform,
      query,
      status: "running",
    },
  });

  // Generate realistic mock data
  const mockPosts = generateMockPosts(platform, query, 20);

  const createdPosts = await Promise.all(
    mockPosts.map((post) =>
      prisma.scrapedPost.create({
        data: {
          ...post,
          scrapeJobId: job.id,
        },
      })
    )
  );

  await prisma.scrapeJob.update({
    where: { id: job.id },
    data: {
      status: "completed",
      postsFound: createdPosts.length,
      completedAt: new Date(),
    },
  });

  return {
    jobId: job.id,
    postsFound: createdPosts.length,
    status: "completed",
  };
}

function generateMockPosts(platform: string, query: string, count: number): Omit<NormalizedPost, "rawData">[] {
  const topics = [
    "How I grew my audience from 0 to 100k in 6 months",
    "The morning routine that 10x'd my productivity",
    "Stop doing this if you want to build wealth",
    "I tested every AI tool so you don't have to",
    "The psychology behind viral content (backed by data)",
    "Why 99% of creators fail in their first year",
    "I spent $10k on ads — here's what actually worked",
    "The content framework nobody is talking about",
    "3 hooks that guarantee views on every platform",
    "How to repurpose one piece of content into 30",
    "The engagement hack that tripled my comments",
    "Why your hooks are killing your content",
    "I studied 500 viral videos — here's the pattern",
    "The #1 mistake new creators make (and how to fix it)",
    "How this unknown creator got 10M views overnight",
    "Content strategy that works in 2025 (not outdated advice)",
    "The secret to writing hooks that stop the scroll",
    "Why consistency beats quality every single time",
    "I reverse-engineered the top 10 creators — here's what I found",
    "The viral formula: data + story + controversy",
  ];

  return Array.from({ length: count }, (_, i) => {
    const views = Math.floor(Math.random() * 5000000) + 5000;
    const likes = Math.floor(views * (Math.random() * 0.08 + 0.02));
    const comments = Math.floor(views * (Math.random() * 0.03 + 0.005));
    const engagementRate = Math.round(((likes + comments) / views) * 100 * 100) / 100;

    return {
      platform,
      url: `https://${platform}.com/post/${Date.now()}-${i}`,
      hookText: topics[i % topics.length],
      caption: `${topics[i % topics.length]}\n\nThis is related to ${query}. Full breakdown in the caption...`,
      views,
      likes,
      comments,
      engagementRate,
      postDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      transcript: `So here's the thing about ${query}. ${topics[i % topics.length]}. Let me break this down for you step by step...`,
      thumbnailUrl: null,
      authorName: `Creator ${i + 1}`,
      authorHandle: `@creator_${i + 1}`,
    };
  });
}

export { transcribeAudio };
