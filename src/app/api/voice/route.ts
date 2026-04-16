import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { analyzeVoice } from "@/lib/agents/scriptWriter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, sampleScripts, energy, sentenceLength, formality, humor } = body;

    const profile = await prisma.voiceProfile.create({
      data: {
        name: name || "My Voice",
        sampleScripts: JSON.stringify(sampleScripts || []),
        energy: energy ?? 7,
        sentenceLength: sentenceLength || "medium",
        formality: formality || "casual",
        humor: humor ?? 5,
      },
    });

    // If sample scripts provided, run voice analysis
    if (sampleScripts && sampleScripts.length > 0) {
      try {
        await analyzeVoice(profile.id);
      } catch {
        // Analysis is optional, continue without it
      }
    }

    // Fetch updated profile
    const updated = await prisma.voiceProfile.findUnique({
      where: { id: profile.id },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Voice profile error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create voice profile" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const profiles = await prisma.voiceProfile.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Fetch profiles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch voice profiles" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Profile ID is required" },
        { status: 400 }
      );
    }

    if (updates.sampleScripts) {
      updates.sampleScripts = JSON.stringify(updates.sampleScripts);
    }

    const profile = await prisma.voiceProfile.update({
      where: { id },
      data: updates,
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 500 }
    );
  }
}
