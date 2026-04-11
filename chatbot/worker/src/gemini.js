/**
 * Google Gemini API client using official SDK
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export async function embed(text, apiKey) {
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const result = await client.getGenerativeModel({ model: 'gemini-embedding-001' }).embedContent(text);
    const fullVector = result.embedding.values;

    // Reduce 3072 dims to 1536 by averaging pairs
    const reduced = [];
    for (let i = 0; i < fullVector.length; i += 2) {
      reduced.push((fullVector[i] + (fullVector[i + 1] || 0)) / 2);
    }
    return reduced;
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
