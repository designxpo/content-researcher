import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ScriptGenerationInput {
  topicId: string;
  voiceProfileId: string;
}

export async function runScriptWriter(input: ScriptGenerationInput) {
  const { topicId, voiceProfileId } = input;

  // Fetch topic with supporting posts
  const topic = await prisma.validatedTopic.findUnique({
    where: { id: topicId },
    include: {
      posts: {
        include: { post: true },
      },
    },
  });

  if (!topic) throw new Error("Topic not found");

  // Fetch voice profile
  const voiceProfile = await prisma.voiceProfile.findUnique({
    where: { id: voiceProfileId },
  });

  if (!voiceProfile) throw new Error("Voice profile not found");

  // Parse sample scripts and voice analysis
  const sampleScripts = JSON.parse(voiceProfile.sampleScripts || "[]");
  const analysis = voiceProfile.analysisResult
    ? JSON.parse(voiceProfile.analysisResult)
    : null;

  // Build the prompt for Claude
  const systemPrompt = buildScriptPrompt(voiceProfile, sampleScripts, analysis);
  const topicContext = buildTopicContext(topic, topic.posts.map((p) => p.post));

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: topicContext,
        },
      ],
    });

    const scriptBody =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Store the generated script
    const script = await prisma.generatedScript.create({
      data: {
        topicId,
        voiceProfileId,
        body: scriptBody,
        status: "draft",
      },
    });

    // Update topic status
    await prisma.validatedTopic.update({
      where: { id: topicId },
      data: { status: "script_generated" },
    });

    return {
      scriptId: script.id,
      body: scriptBody,
      topicName: topic.topicName,
    };
  } catch (error) {
    console.error("Script generation failed:", error);
    throw error;
  }
}

function buildScriptPrompt(
  voiceProfile: {
    energy: number;
    sentenceLength: string;
    formality: string;
    humor: number;
    ctas: string | null;
  },
  sampleScripts: string[],
  analysis: Record<string, unknown> | null
): string {
  const energyDescriptor =
    voiceProfile.energy >= 7
      ? "high-energy, enthusiastic, and fast-paced"
      : voiceProfile.energy >= 4
        ? "balanced energy with natural variation"
        : "calm, measured, and thoughtful";

  const lengthDescriptor =
    voiceProfile.sentenceLength === "short"
      ? "short, punchy sentences (5-10 words)"
      : voiceProfile.sentenceLength === "long"
        ? "longer, flowing sentences with detailed explanations"
        : "medium-length sentences with natural rhythm";

  const formalityDescriptor =
    voiceProfile.formality === "casual"
      ? "casual and conversational, like talking to a friend"
      : voiceProfile.formality === "professional"
        ? "professional and authoritative, but approachable"
        : "balanced between casual and professional";

  const humorDescriptor =
    voiceProfile.humor >= 7
      ? "Use humor frequently — make the audience laugh"
      : voiceProfile.humor >= 4
        ? "Add occasional humor to keep things engaging"
        : "Keep it straight and informative, minimal humor";

  const ctas = voiceProfile.ctas ? JSON.parse(voiceProfile.ctas) : [];

  let prompt = `You are an expert social media script writer. Your job is to write the BODY of a social media script (NOT the opening hook — that will be generated separately).

## Voice Profile Parameters
- Energy: ${energyDescriptor} (${voiceProfile.energy}/10)
- Sentence Length: ${lengthDescriptor}
- Tone: ${formalityDescriptor}
- Humor: ${humorDescriptor} (${voiceProfile.humor}/10)
${ctas.length > 0 ? `- Preferred CTAs: ${ctas.join(", ")}` : ""}

## Writing Rules
1. Do NOT write an opening hook — start with the first main point
2. Keep the script between 150-300 words (30-60 seconds when spoken)
3. Use line breaks between distinct thoughts
4. Include a clear CTA at the end
5. Write for SPOKEN delivery — use contractions, natural pauses, conversational flow
6. Match the voice parameters above precisely`;

  if (sampleScripts.length > 0) {
    prompt += `\n\n## Reference Scripts (Match this style):\n`;
    sampleScripts.slice(0, 3).forEach((script: string, i: number) => {
      prompt += `\n--- Script ${i + 1} ---\n${script.substring(0, 500)}\n`;
    });
  }

  if (analysis) {
    prompt += `\n\n## Voice Analysis Results:\n${JSON.stringify(analysis, null, 2)}`;
  }

  return prompt;
}

function buildTopicContext(
  topic: { topicName: string; description: string | null; avgViews: number; avgER: number },
  posts: Array<{ hookText: string | null; caption: string | null; transcript: string | null; views: number }>
): string {
  let context = `Write a script about this validated topic:

**Topic:** ${topic.topicName}
**Description:** ${topic.description || "N/A"}
**Average Views:** ${topic.avgViews.toLocaleString()}
**Average Engagement Rate:** ${topic.avgER}%

## Reference Posts (high-performing content on this topic):
`;

  posts.slice(0, 5).forEach((post, i) => {
    context += `\n### Post ${i + 1} (${post.views.toLocaleString()} views)`;
    if (post.hookText) context += `\nHook: "${post.hookText}"`;
    if (post.transcript) context += `\nTranscript excerpt: "${post.transcript.substring(0, 300)}"`;
    context += "\n";
  });

  context += `\nGenerate ONLY the script body. No hook, no title, no formatting instructions.`;

  return context;
}

// Mock script writer for development
export async function runMockScriptWriter(input: ScriptGenerationInput) {
  const topic = await prisma.validatedTopic.findUnique({
    where: { id: input.topicId },
  });

  if (!topic) throw new Error("Topic not found");

  const mockScript = `Here's the thing most people get wrong about ${topic.topicName.toLowerCase()}.

They think it's about working harder. But the data tells a completely different story.

I analyzed over 500 high-performing posts and found a pattern that keeps repeating.

The creators who are winning right now? They're not doing more — they're doing different.

Let me break down the three key things they all have in common.

First, they lead with a specific result. Not "I grew my audience" — but "I added 47,000 followers in 22 days."

Specificity builds trust instantly.

Second, they structure their content around one clear transformation. Before → after. Problem → solution.

The human brain is wired for stories, not bullet points.

Third — and this is the one nobody talks about — they repost what works.

Your best-performing content from 3 months ago? Your new followers haven't seen it.

So here's your action step: go through your last 30 posts right now. Find the top 3 by engagement rate. And reformat them for this week.

That's it. No complicated strategy. Just data-driven decisions.

Drop a comment if you want me to break down my exact content calendar.`;

  const script = await prisma.generatedScript.create({
    data: {
      topicId: input.topicId,
      voiceProfileId: input.voiceProfileId,
      body: mockScript,
      status: "draft",
    },
  });

  await prisma.validatedTopic.update({
    where: { id: input.topicId },
    data: { status: "script_generated" },
  });

  return {
    scriptId: script.id,
    body: mockScript,
    topicName: topic.topicName,
  };
}

// Analyze voice from sample scripts using Claude
export async function analyzeVoice(voiceProfileId: string) {
  const profile = await prisma.voiceProfile.findUnique({
    where: { id: voiceProfileId },
  });

  if (!profile) throw new Error("Voice profile not found");

  const scripts = JSON.parse(profile.sampleScripts || "[]");
  if (scripts.length === 0) {
    return { error: "No sample scripts provided" };
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Analyze these scripts and identify the author's unique voice characteristics. 
          
Scripts:
${scripts.map((s: string, i: number) => `--- Script ${i + 1} ---\n${s}\n`).join("\n")}

Respond in this exact JSON format:
{
  "vocabulary_level": "simple|intermediate|advanced",
  "sentence_avg_length": "short|medium|long",
  "energy": 1-10,
  "formality": "casual|balanced|professional",
  "humor": 1-10,
  "recurring_patterns": ["pattern1", "pattern2"],
  "common_ctas": ["cta1", "cta2"],
  "tone_keywords": ["keyword1", "keyword2", "keyword3"],
  "summary": "2-3 sentence summary of this person's writing voice"
}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const analysis = JSON.parse(jsonMatch[0]);

    // Update voice profile with analysis
    await prisma.voiceProfile.update({
      where: { id: voiceProfileId },
      data: {
        analysisResult: JSON.stringify(analysis),
        energy: analysis.energy || profile.energy,
        sentenceLength: analysis.sentence_avg_length || profile.sentenceLength,
        formality: analysis.formality || profile.formality,
        humor: analysis.humor || profile.humor,
        ctas: analysis.common_ctas
          ? JSON.stringify(analysis.common_ctas)
          : profile.ctas,
      },
    });

    return analysis;
  } catch (error) {
    console.error("Voice analysis failed:", error);
    return {
      summary: "Voice analysis requires an Anthropic API key. Using default parameters.",
      energy: profile.energy,
      formality: profile.formality,
      humor: profile.humor,
    };
  }
}
