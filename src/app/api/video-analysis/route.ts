import { NextRequest, NextResponse } from "next/server";
import { runVideoAnalysis, batchVideoAnalysis } from "@/lib/agents/videoAnalysis";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, postIds, videoUrl } = body;

    if (postIds && Array.isArray(postIds)) {
      const results = await batchVideoAnalysis(postIds);
      return NextResponse.json({ analyses: results });
    }

    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 });
    }

    const result = await runVideoAnalysis({ postId, videoUrl });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Video analysis error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Video analysis failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const analyses = await prisma.videoAnalysis.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Fetch analyses error:", error);
    return NextResponse.json({ error: "Failed to fetch analyses" }, { status: 500 });
  }
}
