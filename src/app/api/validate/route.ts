import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runValidator, runMockValidator } from "@/lib/agents/validator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scrapeJobId, useMock = true } = body;

    if (!scrapeJobId) {
      return NextResponse.json(
        { error: "scrapeJobId is required" },
        { status: 400 }
      );
    }

    const result = useMock
      ? await runMockValidator(scrapeJobId)
      : await runValidator(scrapeJobId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Validation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const topics = await prisma.validatedTopic.findMany({
      orderBy: { score: "desc" },
      include: {
        posts: {
          include: { post: true },
          take: 5,
        },
        _count: { select: { scripts: true } },
      },
    });

    return NextResponse.json(topics);
  } catch (error) {
    console.error("Fetch topics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}
