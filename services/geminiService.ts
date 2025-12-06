import { GoogleGenAI } from "@google/genai";
import { Article } from "../types";

const initGenAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateNewsInsights = async (articles: Article[]): Promise<string> => {
  try {
    const ai = initGenAI();
    
    // Prepare the context for Gemini
    const articlesList = articles.map(a => `- ${a.title} (Source: ${a.source}, Date: ${a.date})`).join('\n');
    const prompt = `Based on the following news headlines, provide a concise "Executive Briefing" in 3 bullet points summarizing the key events and prevailing sentiment. Keep it professional and under 100 words.\n\n${articlesList}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional news analyst providing brief updates.",
        temperature: 0.3, // Lower temperature for factual summary
      }
    });

    return response.text || "Unable to generate insights at this time.";
  } catch (error) {
    console.error("Gemini AI Error:", error);
    return "AI Insight service is temporarily unavailable. Please check your API key.";
  }
};