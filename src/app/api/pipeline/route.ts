import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runMockScraper } from "@/lib/agents/scraper";
import { runMockValidator } from "@/lib/agents/validator";
import { runMockScriptWriter } from "@/lib/agents/scriptWriter";
import { runMockHookGenerator } from "@/lib/agents/hookGenerator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform = "instagram", query, voiceProfileId } = body;

    if (!query) {
      return NextResponse.json(
        { error: "query is required" },
        { status: 400 }
      );
    }

    // Ensure we have a voice profile
    let profileId = voiceProfileId;
    if (!profileId) {
      // Try to find an active profile, or create a default one
      const existingProfile = await prisma.voiceProfile.findFirst({
        where: { isActive: true },
      });
      if (existingProfile) {
        profileId = existingProfile.id;
      } else {
        const newProfile = await prisma.voiceProfile.create({
          data: {
            name: "Default",
            sampleScripts: "[]",
            energy: 7,
            sentenceLength: "medium",
            formality: "casual",
            humor: 5,
          },
        });
        profileId = newProfile.id;
      }
    }

    const results: Record<string, unknown> = {};

    // Step 1: Scrape
    const scrapeResult = await runMockScraper({ platform, query });
    results.scrape = scrapeResult;

    // Step 2: Validate
    const validateResult = await runMockValidator(scrapeResult.jobId);
    results.validate = validateResult;

    // Step 3: Generate script for top topic
    if (validateResult.topics.length > 0) {
      // Get the top topic from the database (it was created during validation)
      const topTopic = await prisma.validatedTopic.findFirst({
        where: { scrapeJobId: scrapeResult.jobId },
        orderBy: { score: "desc" },
      });

      if (topTopic) {
        const scriptResult = await runMockScriptWriter({
          topicId: topTopic.id,
          voiceProfileId: profileId,
        });
        results.script = scriptResult;

        // Step 4: Generate hooks
        const hookResult = await runMockHookGenerator(scriptResult.scriptId);
        results.hooks = hookResult;
      }
    }

    results.status = "completed";
    return NextResponse.json(results);
  } catch (error) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Pipeline failed" },
      { status: 500 }
    );
  }
}
