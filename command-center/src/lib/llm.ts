import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

export function getOpenAIClient() {
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY saknas i miljövariablerna.");
  }
  return new OpenAI({ apiKey });
}

