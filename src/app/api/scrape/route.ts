import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runScraper, runMockScraper } from "@/lib/agents/scraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, query, maxItems = 50, useMock = true } = body;

    if (!platform || !query) {
      return NextResponse.json(
        { error: "Platform and query are required" },
        { status: 400 }
      );
    }

    const validPlatforms = ["instagram", "youtube", "twitter"];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(", ")}` },
        { status: 400 }
      );
    }

    // Use mock scraper if no API keys or explicitly requested
    const result = useMock
      ? await runMockScraper({ platform, query, maxItems })
      : await runScraper({ platform, query, maxItems });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Scrape error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scraping failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const jobs = await prisma.scrapeJob.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error("Fetch jobs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scrape jobs" },
      { status: 500 }
    );
  }
}
