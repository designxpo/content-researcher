import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface CampaignInput {
  topicId: string;
  scriptId?: string;
  platforms: ("meta" | "google")[];
  landingPageUrl?: string;
  targetAudience?: string;
}

const META_AD_TYPES = ["feed", "story", "reel"] as const;
const GOOGLE_AD_TYPES = ["search", "display"] as const;

export async function runCampaignGenerator(input: CampaignInput) {
  const { topicId, scriptId, platforms, landingPageUrl, targetAudience } = input;

  const topic = await prisma.validatedTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic) throw new Error("Topic not found");

  let scriptBody = "";
  if (scriptId) {
    const script = await prisma.generatedScript.findUnique({
      where: { id: scriptId },
      include: { hooks: true },
    });
    if (script) {
      const selectedHook = script.hooks.find((h: any) => h.selected);
      scriptBody = selectedHook
        ? `${selectedHook.hookText}\n\n${script.body}`
        : script.body;
    }
  }

  const creatives: Array<{
    id: string;
    platform: string;
    adType: string;
    headline: string;
    primaryText: string;
    description: string;
    callToAction: string;
  }> = [];

  for (const platform of platforms) {
    const adTypes = platform === "meta" ? META_AD_TYPES : GOOGLE_AD_TYPES;
    
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: `Generate ${platform === "meta" ? "Meta (Facebook/Instagram)" : "Google"} ad creatives for this topic.

**Topic:** ${topic.topicName}
**Description:** ${topic.description || "N/A"}
${scriptBody ? `**Original Script:** ${scriptBody.substring(0, 500)}` : ""}
${targetAudience ? `**Target Audience:** ${targetAudience}` : ""}
${landingPageUrl ? `**Landing Page:** ${landingPageUrl}` : ""}

Generate ad creatives for these formats: ${adTypes.join(", ")}

For each format, create:
- headline (max 40 chars for Meta, max 30 chars for Google Search)
- primaryText (max 125 chars for Meta Feed, max 90 chars for Google)
- description (max 30 chars)  
- callToAction (e.g. "Learn More", "Sign Up", "Shop Now", "Download")

Rules:
- Each format should have a DIFFERENT angle
- Use the viral topic's proven messaging
- Hooks should stop the scroll
- CTAs should be specific and actionable
- Write for CONVERSION, not just engagement

Respond in this exact JSON format:
{
  "creatives": [
    {
      "adType": "format_name",
      "headline": "...",
      "primaryText": "...",
      "description": "...",
      "callToAction": "..."
    }
  ]
}`,
          },
        ],
      });

      const responseText =
        response.content[0].type === "text" ? response.content[0].text : "";
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]);
      
      for (const creative of parsed.creatives) {
        const created = await prisma.campaignCreative.create({
          data: {
            topicId,
            scriptId: scriptId || null,
            platform,
            adType: creative.adType,
            headline: creative.headline,
            primaryText: creative.primaryText,
            description: creative.description || "",
            callToAction: creative.callToAction,
            targetAudience: targetAudience || null,
            landingPageUrl: landingPageUrl || null,
          },
        });
        creatives.push({
          id: created.id,
          platform,
          adType: creative.adType,
          headline: creative.headline,
          primaryText: creative.primaryText,
          description: creative.description || "",
          callToAction: creative.callToAction,
        });
      }
    } catch (error) {
      console.error(`Campaign generation for ${platform} failed:`, error);
    }
  }

  return { topicId, creatives };
}

// Mock campaign generator for development
export async function runMockCampaignGenerator(input: CampaignInput) {
  const { topicId, scriptId, platforms, landingPageUrl, targetAudience } = input;

  const topic = await prisma.validatedTopic.findUnique({
    where: { id: topicId },
  });

  if (!topic) throw new Error("Topic not found");

  const topicLower = topic.topicName.toLowerCase();

  const mockCreatives: Record<string, Array<{
    adType: string;
    headline: string;
    primaryText: string;
    description: string;
    callToAction: string;
  }>> = {
    meta: [
      {
        adType: "feed",
        headline: `Master ${topicLower} Today`,
        primaryText: `Stop guessing. Start growing. Our data-driven approach to ${topicLower} has helped 10,000+ creators scale. Get the free playbook.`,
        description: "Free playbook inside",
        callToAction: "Download Now",
      },
      {
        adType: "story",
        headline: `The ${topicLower} secret`,
        primaryText: `We analyzed 500 viral posts. Here's the #1 pattern behind ${topicLower}. Swipe up for the breakdown.`,
        description: "Data-backed insights",
        callToAction: "Learn More",
      },
      {
        adType: "reel",
        headline: `Why your ${topicLower} fails`,
        primaryText: `99% of creators get ${topicLower} wrong. Here's what the top 1% do differently — and how you can copy it today.`,
        description: "Copy the top 1%",
        callToAction: "Sign Up",
      },
    ],
    google: [
      {
        adType: "search",
        headline: `${topic.topicName} Framework`,
        primaryText: `Data-backed ${topicLower} system. Proven by 10K+ creators. Get free access to our viral content playbook.`,
        description: "Free playbook",
        callToAction: "Get Started",
      },
      {
        adType: "display",
        headline: `Scale Your ${topicLower}`,
        primaryText: `The same ${topicLower} framework used by top creators. Stop guessing, start growing with data-driven content.`,
        description: "Join 10K+ creators",
        callToAction: "Learn More",
      },
    ],
  };

  const creatives: Array<{
    id: string;
    platform: string;
    adType: string;
    headline: string;
    primaryText: string;
    description: string;
    callToAction: string;
  }> = [];

  for (const platform of platforms) {
    const platformCreatives = mockCreatives[platform] || [];
    for (const creative of platformCreatives) {
      const created = await prisma.campaignCreative.create({
        data: {
          topicId,
          scriptId: scriptId || null,
          platform,
          adType: creative.adType,
          headline: creative.headline,
          primaryText: creative.primaryText,
          description: creative.description,
          callToAction: creative.callToAction,
          targetAudience: targetAudience || null,
          landingPageUrl: landingPageUrl || null,
        },
      });
      creatives.push({ id: created.id, platform, ...creative });
    }
  }

  return { topicId, creatives };
}
