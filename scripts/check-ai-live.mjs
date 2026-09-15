import "dotenv/config";
import { callAIJSON, AI_MODEL } from "../src/modules/ai/ai.client.js";

console.log("model:", AI_MODEL);
try {
  const r = await callAIJSON({
    system: "Reply with JSON only.",
    user: '{"ping": 1}',
    temperature: 0,
    maxTokens: 50,
  });
  console.log("LIVE AI OK:", JSON.stringify(r));
} catch (e) {
  console.log("AI CALL FAILED:", e.message);
}
process.exit(0);
