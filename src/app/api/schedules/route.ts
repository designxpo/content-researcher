import { NextRequest, NextResponse } from "next/server";
import { createSchedule, updateSchedule, deleteSchedule, getSchedules } from "@/lib/agents/scheduler";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, platform, query, cronExpr, autoScript, autoHooks } = body;

    if (!name || !platform || !query || !cronExpr) {
      return NextResponse.json(
        { error: "name, platform, query, and cronExpr are required" },
        { status: 400 }
      );
    }

    const schedule = await createSchedule({
      name,
      platform,
      query,
      cronExpr,
      autoScript,
      autoHooks,
    });

    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Schedule creation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create schedule" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const schedules = await getSchedules();
    return NextResponse.json(schedules);
  } catch (error) {
    console.error("Fetch schedules error:", error);
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
    }

    const schedule = await updateSchedule(id, updates);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Schedule update error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Schedule ID is required" }, { status: 400 });
    }

    await deleteSchedule(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Schedule deletion error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete schedule" },
      { status: 500 }
    );
  }
}
