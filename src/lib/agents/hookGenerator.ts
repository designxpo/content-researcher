import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../prisma";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const HOOK_FRAMEWORKS = [
  {
    id: "aspirational",
    name: "Aspirational",
    emoji: "🔥",
    description: "Paint a vivid picture of what's possible",
    instruction: "Create a hook that uses aspirational framing — show the audience what they could achieve or become. Use 'What if you could...' or 'Imagine...' style openings.",
  },
  {
    id: "pain_point",
    name: "Pain Point",
    emoji: "😰",
    description: "Target a specific frustration",
    instruction: "Create a hook that directly targets a pain point or common mistake. Use 'Stop doing X if...' or 'The reason you're failing at...' style openings.",
  },
  {
    id: "exclusivity",
    name: "Exclusivity",
    emoji: "🔒",
    description: "Make the viewer feel like an insider",
    instruction: "Create a hook that uses exclusivity — make the viewer feel like they're getting insider knowledge. Use 'Most people don't know...' or 'This is what nobody tells you...' style openings.",
  },
  {
    id: "curiosity",
    name: "Curiosity Gap",
    emoji: "🤔",
    description: "Open a loop the viewer needs to close",
    instruction: "Create a hook that opens a curiosity gap — present a surprising result or claim that makes the viewer NEED to keep watching. Use 'I tested X for 30 days...' or 'This one change...' style openings.",
  },
  {
    id: "contrarian",
    name: "Contrarian",
    emoji: "⚡",
    description: "Challenge conventional wisdom",
    instruction: "Create a hook that is contrarian — challenge something the audience believes is true. Use 'Everything you've been told about X is wrong' or 'Unpopular opinion:' style openings.",
  },
];

export async function runHookGenerator(scriptId: string) {
  const script = await prisma.generatedScript.findUnique({
    where: { id: scriptId },
    include: {
      topic: true,
    },
  });

  if (!script) throw new Error("Script not found");

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: `Generate 5 hook variations for this social media script. Each hook must use a different psychological framework.

**Topic:** ${script.topic.topicName}
**Script Body Preview:** ${script.body.substring(0, 500)}

**RULES:**
- Each hook must be MAXIMUM 2 lines
- Each hook must be speakable in under 4 seconds
- Each hook must stop the scroll — no generic openings
- Use natural, conversational language

**Generate one hook for each framework:**

1. ASPIRATIONAL (🔥): Paint a vivid picture of what's possible
2. PAIN POINT (😰): Target a specific frustration  
3. EXCLUSIVITY (🔒): Make the viewer feel like an insider
4. CURIOSITY GAP (🤔): Open a loop the viewer needs to close
5. CONTRARIAN (⚡): Challenge conventional wisdom

Respond in this exact JSON format:
{
  "hooks": [
    {"framework": "aspirational", "text": "hook text here"},
    {"framework": "pain_point", "text": "hook text here"},
    {"framework": "exclusivity", "text": "hook text here"},
    {"framework": "curiosity", "text": "hook text here"},
    {"framework": "contrarian", "text": "hook text here"}
  ]
}`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Claude response");

    const parsed = JSON.parse(jsonMatch[0]);
    const hooks = parsed.hooks;

    // Store hooks in database
    const createdHooks = await Promise.all(
      hooks.map(
        (hook: { framework: string; text: string }, index: number) =>
          prisma.generatedHook.create({
            data: {
              scriptId,
              hookText: hook.text,
              framework: hook.framework,
              selected: index === 0, // Default select the first one
            },
          })
      )
    );

    return {
      scriptId,
      hooks: createdHooks.map((h: { id: string; hookText: string; framework: string; selected: boolean }) => ({
        id: h.id,
        hookText: h.hookText,
        framework: h.framework,
        frameworkInfo: HOOK_FRAMEWORKS.find((f) => f.id === h.framework),
        selected: h.selected,
      })),
    };
  } catch (error) {
    console.error("Hook generation failed:", error);
    throw error;
  }
}

// Mock hook generator for development
export async function runMockHookGenerator(scriptId: string) {
  const script = await prisma.generatedScript.findUnique({
    where: { id: scriptId },
    include: { topic: true },
  });

  if (!script) throw new Error("Script not found");

  const topicName = script.topic.topicName.toLowerCase();

  const mockHooks = [
    {
      framework: "aspirational",
      text: `What if your next piece of content about ${topicName} reached 1 million people?`,
    },
    {
      framework: "pain_point",
      text: `Stop creating content about ${topicName} until you fix this one thing.`,
    },
    {
      framework: "exclusivity",
      text: `The ${topicName} strategy that top 1% creators use — and nobody shares.`,
    },
    {
      framework: "curiosity",
      text: `I tested every ${topicName} tactic for 30 days. Only one worked.`,
    },
    {
      framework: "contrarian",
      text: `Everything you've been told about ${topicName} is making you worse.`,
    },
  ];

  const createdHooks = await Promise.all(
    mockHooks.map((hook, index) =>
      prisma.generatedHook.create({
        data: {
          scriptId,
          hookText: hook.text,
          framework: hook.framework,
          selected: index === 0,
        },
      })
    )
  );

  return {
    scriptId,
    hooks: createdHooks.map((h: { id: string; hookText: string; framework: string; selected: boolean }) => ({
      id: h.id,
      hookText: h.hookText,
      framework: h.framework,
      frameworkInfo: HOOK_FRAMEWORKS.find((f) => f.id === h.framework),
      selected: h.selected,
    })),
  };
}

export { HOOK_FRAMEWORKS };
