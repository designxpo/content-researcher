import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [
      totalPosts,
      totalTopics,
      totalScripts,
      totalHooks,
      recentJobs,
      topTopics,
    ] = await Promise.all([
      prisma.scrapedPost.count(),
      prisma.validatedTopic.count(),
      prisma.generatedScript.count(),
      prisma.generatedHook.count(),
      prisma.scrapeJob.findMany({
        orderBy: { startedAt: "desc" },
        take: 5,
        include: { _count: { select: { posts: true } } },
      }),
      prisma.validatedTopic.findMany({
        orderBy: { score: "desc" },
        take: 5,
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalPosts,
        totalTopics,
        totalScripts,
        totalHooks,
      },
      recentJobs,
      topTopics,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
