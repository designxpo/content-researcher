import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runCampaignGenerator, runMockCampaignGenerator } from "@/lib/agents/campaignGenerator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicId, scriptId, platforms = ["meta", "google"], landingPageUrl, targetAudience, useMock = true } = body;

    if (!topicId) {
      return NextResponse.json({ error: "topicId is required" }, { status: 400 });
    }

    const result = useMock
      ? await runMockCampaignGenerator({ topicId, scriptId, platforms, landingPageUrl, targetAudience })
      : await runCampaignGenerator({ topicId, scriptId, platforms, landingPageUrl, targetAudience });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Campaign generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Campaign generation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const campaigns = await prisma.campaignCreative.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error("Fetch campaigns error:", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}
