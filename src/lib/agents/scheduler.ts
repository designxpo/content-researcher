import { prisma } from "../prisma";

// Parse cron expression into next run time
function parseCronToNextRun(cronExpr: string): Date {
  // Simplified cron parser for common patterns
  // Format: minute hour day month weekday
  const parts = cronExpr.split(" ");
  const now = new Date();
  const next = new Date(now);

  const minute = parts[0] === "*" ? now.getMinutes() : parseInt(parts[0]);
  const hour = parts[1] === "*" ? now.getHours() : parseInt(parts[1]);

  next.setMinutes(minute);
  next.setSeconds(0);
  next.setMilliseconds(0);

  if (parts[1] !== "*") {
    next.setHours(hour);
  }

  // If the time has already passed today, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

// Format cron expression to human readable
export function cronToHuman(cronExpr: string): string {
  const presets: Record<string, string> = {
    "0 9 * * *": "Daily at 9:00 AM",
    "0 9 * * 1-5": "Weekdays at 9:00 AM",
    "0 6 * * *": "Daily at 6:00 AM",
    "0 12 * * *": "Daily at 12:00 PM",
    "0 18 * * *": "Daily at 6:00 PM",
    "0 9 * * 1": "Every Monday at 9:00 AM",
    "0 9,18 * * *": "Twice daily (9 AM & 6 PM)",
    "0 */6 * * *": "Every 6 hours",
    "0 */12 * * *": "Every 12 hours",
  };

  return presets[cronExpr] || cronExpr;
}

export const SCHEDULE_PRESETS = [
  { label: "Daily at 9:00 AM", value: "0 9 * * *" },
  { label: "Weekdays at 9:00 AM", value: "0 9 * * 1-5" },
  { label: "Daily at 6:00 AM", value: "0 6 * * *" },
  { label: "Daily at 12:00 PM", value: "0 12 * * *" },
  { label: "Daily at 6:00 PM", value: "0 18 * * *" },
  { label: "Every Monday at 9:00 AM", value: "0 9 * * 1" },
  { label: "Twice daily (9 AM & 6 PM)", value: "0 9,18 * * *" },
  { label: "Every 6 hours", value: "0 */6 * * *" },
  { label: "Every 12 hours", value: "0 */12 * * *" },
];

interface ScheduleInput {
  name: string;
  platform: string;
  query: string;
  cronExpr: string;
  autoScript?: boolean;
  autoHooks?: boolean;
}

// Create a new pipeline schedule
export async function createSchedule(input: ScheduleInput) {
  const nextRunAt = parseCronToNextRun(input.cronExpr);

  return prisma.pipelineSchedule.create({
    data: {
      name: input.name,
      platform: input.platform,
      query: input.query,
      cronExpr: input.cronExpr,
      isActive: true,
      nextRunAt,
      autoScript: input.autoScript || false,
      autoHooks: input.autoHooks || false,
    },
  });
}

// Update schedule
export async function updateSchedule(
  id: string,
  updates: Partial<ScheduleInput & { isActive: boolean }>
) {
  const data: Record<string, unknown> = { ...updates };
  if (updates.cronExpr) {
    data.nextRunAt = parseCronToNextRun(updates.cronExpr);
  }
  return prisma.pipelineSchedule.update({
    where: { id },
    data,
  });
}

// Delete schedule
export async function deleteSchedule(id: string) {
  return prisma.pipelineSchedule.delete({
    where: { id },
  });
}

// Get all schedules
export async function getSchedules() {
  return prisma.pipelineSchedule.findMany({
    orderBy: { createdAt: "desc" },
  });
}

// Mark a schedule as having just run
export async function markScheduleRun(id: string) {
  const schedule = await prisma.pipelineSchedule.findUnique({
    where: { id },
  });

  if (!schedule) throw new Error("Schedule not found");

  const nextRunAt = parseCronToNextRun(schedule.cronExpr);

  return prisma.pipelineSchedule.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      nextRunAt,
      runCount: schedule.runCount + 1,
    },
  });
}

// Check which schedules are due to run
export async function getDueSchedules() {
  const now = new Date();
  return prisma.pipelineSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
  });
}
