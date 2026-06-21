import "dotenv/config";
import OpenAI from "openai";

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY is not set.");
}
const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Learning Card Generator",
      },
  });
export { client , model };