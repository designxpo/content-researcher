import { NextRequest, NextResponse } from "next/server";
import { logPerformance, recalibrateWeights, getActiveWeights, getWeightHistory } from "@/lib/agents/performanceLoop";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    if (action === "log") {
      const { scriptId, actualViews, actualER, actualComments, actualLikes, platform, postUrl } = data;
      if (!scriptId) {
        return NextResponse.json({ error: "scriptId is required" }, { status: 400 });
      }
      const result = await logPerformance({
        scriptId,
        actualViews: actualViews || 0,
        actualER: actualER || 0,
        actualComments: actualComments || 0,
        actualLikes: actualLikes || 0,
        platform: platform || "unknown",
        postUrl,
      });
      return NextResponse.json(result);
    }

    if (action === "recalibrate") {
      const result = await recalibrateWeights();
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action. Use 'log' or 'recalibrate'" }, { status: 400 });
  } catch (error) {
    console.error("Performance error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Performance tracking failed" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [weights, history] = await Promise.all([
      getActiveWeights(),
      getWeightHistory(),
    ]);
    return NextResponse.json({ weights, history });
  } catch (error) {
    console.error("Fetch weights error:", error);
    return NextResponse.json({ error: "Failed to fetch weights" }, { status: 500 });
  }
}
