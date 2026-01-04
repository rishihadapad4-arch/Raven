
import { GoogleGenAI, Type } from "@google/genai";
import { AIInsight } from "../types";

// Always initialize with the named parameter apiKey from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCommunityInsights = async (communityName: string, recentActivity: string[]): Promise<AIInsight> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        parts: [{
          text: `Analyse the activity for the private community "${communityName}". Here is the recent activity: ${recentActivity.join(", ")}. Provide a strategic summary, community sentiment, and actionable recommendations.`
        }]
      }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            sentiment: { 
              type: Type.STRING, 
              enum: ['positive', 'neutral', 'cautionary'] 
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "sentiment", "recommendations"]
        }
      }
    });

    // Directly access the .text property
    const resultText = response.text;
    if (!resultText) throw new Error("No response text from Gemini");
    
    return JSON.parse(resultText) as AIInsight;
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      summary: "Could not retrieve automated insights at this time.",
      sentiment: "neutral",
      recommendations: [
        "Manually review community reports", 
        "Engage with top active members",
        "Verify network integrity"
      ]
    };
  }
};
