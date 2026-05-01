import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getSmartCategorization(note: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) return 'General';
  
  try {
    const prompt = `Classify this expense note into a single broad category (e.g., Food, Transport, Utilities, Entertainment, Health, Shopping, General). Only return the category name: "${note}"`;
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    const text = response.text || 'General';
    return text.trim();
  } catch (error) {
    console.error("Gemini classification failed:", error);
    return 'General';
  }
}
