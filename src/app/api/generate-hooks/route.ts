import { NextRequest, NextResponse } from "next/server";
import { runHookGenerator, runMockHookGenerator } from "@/lib/agents/hookGenerator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptId, useMock = true } = body;

    if (!scriptId) {
      return NextResponse.json(
        { error: "scriptId is required" },
        { status: 400 }
      );
    }

    const result = useMock
      ? await runMockHookGenerator(scriptId)
      : await runHookGenerator(scriptId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Hook generation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Hook generation failed" },
      { status: 500 }
    );
  }
}
