
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Smart sizing assistant to help users choose the right package size based on their items.
 */
// Recommendation: Using gemini-3-flash-preview for basic Q&A tasks as per guidelines.
export const getSizingRecommendation = async (itemDescription: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Determine which package size (Small, Medium, Large) fits best for: "${itemDescription}". 
      Small: up to 8x5x2 inches.
      Medium: up to 12x9x6 inches.
      Large: up to 18x12x12 inches.
      Return a brief recommendation.`,
      config: {
        temperature: 0.2,
      },
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Assistant Error:", error);
    return "Unable to determine size automatically. Please check our manual dimensions.";
  }
};
