import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "dummy-key-for-builds",
});

export const MODELS = {
  RESUME_ANALYSIS: 'anthropic/claude-3.5-sonnet',
  MOCK_INTERVIEW: 'openai/gpt-4o',
  CAREER_TWIN: 'anthropic/claude-3-opus',
  EMBEDDINGS: 'openai/text-embedding-3-small'
};

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function generateAIResponse(prompt: string, model: string = MODELS.CAREER_TWIN) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error details:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return text || "No response generated.";
    } catch (error) {
      console.error("Gemini AI Response Error:", error);
      throw error;
    }
  }

  if (!process.env.OPENROUTER_API_KEY) {
    await delay(1500);
    return "This is a simulated AI response because the API keys are not set. In production, this would be a real response from " + model;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate AI response.");
  }
}

export async function generateStructuredAIResponse(
  prompt: string, 
  systemPrompt: string, 
  model: string, 
  simulatedPayload?: any,
  fileBase64?: string,
  fileMimeType?: string
) {
  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  ...(fileBase64 && fileMimeType ? [
                    {
                      inlineData: {
                        mimeType: fileMimeType,
                        data: fileBase64
                      }
                    }
                  ] : []),
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            systemInstruction: {
              parts: [
                {
                  text: systemPrompt,
                },
              ],
            },
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Error details:", errorText);
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error("No text response from Gemini");
      }
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini Structured AI Error:", error);
      if (simulatedPayload) {
        return simulatedPayload;
      }
      throw error;
    }
  }

  if (!process.env.OPENROUTER_API_KEY && simulatedPayload) {
    await delay(3000); // Simulate processing time for heavy tasks like Resume Parsing
    return simulatedPayload;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: model,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
    });
    return JSON.parse(completion.choices[0].message.content || "{}");
  } catch (error) {
    console.error("Structured AI Generation Error:", error);
    throw new Error("Failed to generate structured AI response.");
  }
}
