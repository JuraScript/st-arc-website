/**
 * Google Gemini API client using official SDK
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function embed(text, apiKey) {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: 'gemini-embedding-001' });
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: 1536,
    });
    return result.embedding.values;
  } catch (err) {
    console.error('[EMBED]', err.message);
    throw err;
  }
}

export async function generateAnswer({ systemPrompt, context, question, apiKey }) {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemPrompt,
    });

    const userContent = `KNOWLEDGE BASE CONTEXT:
${context}

USER QUESTION:
${question}`;

    const result = await model.generateContent(userContent);
    const text = result.response.text();

    if (!text) {
      throw new Error('Gemini returned no text');
    }

    return text.trim();
  } catch (err) {
    console.error('[CHAT]', err.message);
    throw err;
  }
}
