import OpenAI from "openai";

let cachedClient = null;

const getClient = () => {
  if (cachedClient) return cachedClient;

  const openRouterKey =
    process.env.OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEYS?.split(",")[0]?.trim();

  if (openRouterKey) {
    cachedClient = new OpenAI({
      apiKey: openRouterKey,
      baseURL: "https://openrouter.ai/api/v1",
      timeout: 25000,
      defaultHeaders: {
        "HTTP-Referer": "https://skillsync.ai",
        "X-Title": "SkillSync AI",
      },
    });
    return cachedClient;
  }

  const openAiKey =
    process.env.OPENAI_API_KEY ||
    process.env.OPENAI_API_KEYS?.split(",")[0]?.trim();

  if (openAiKey) {
    cachedClient = new OpenAI({ apiKey: openAiKey, timeout: 25000 });
    return cachedClient;
  }

  throw new Error("No AI API key configured (OPENROUTER_API_KEY or OPENAI_API_KEY)");
};

export const AI_MODEL = process.env.AI_MODEL || "openrouter/auto";

export const callAIJSON = async ({ system, user, temperature = 0.2, maxTokens = 2000 }) => {
  const client = getClient();
  // Hard timeout wrapper — OpenRouter free models can be slow/queued
  const timeoutMs = 22000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("AI request timed out after 22s")), timeoutMs),
  );
  const response = await Promise.race([
    client.chat.completions.create({
      model: AI_MODEL,
      temperature,
      response_format: { type: "json_object" },
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    timeoutPromise,
  ]);

  const content = response.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI returned empty response");

  try {
    return JSON.parse(content);
  } catch {
    throw new Error("AI returned invalid JSON");
  }
};
