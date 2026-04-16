import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runScriptWriter, runMockScriptWriter } from "@/lib/agents/scriptWriter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicId, voiceProfileId, useMock = true } = body;

    if (!topicId || !voiceProfileId) {
      return NextResponse.json(
        { error: "topicId and voiceProfileId are required" },
        { status: 400 }
      );
    }

    const result = useMock
      ? await runMockScriptWriter({ topicId, voiceProfileId })
      : await runScriptWriter({ topicId, voiceProfileId });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Script generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Script generation failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const scripts = await prisma.generatedScript.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        topic: true,
        voiceProfile: true,
        hooks: true,
      },
    });

    return NextResponse.json(scripts);
  } catch (error) {
    console.error("Fetch scripts error:", error);
    return NextResponse.json(
      { error: "Failed to fetch scripts" },
      { status: 500 }
    );
  }
}
