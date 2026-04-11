import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GOOGLE_API_KEY;
const client = new GoogleGenerativeAI(apiKey);

try {
  const models = await client.listModels();
  console.log('=== AVAILABLE MODELS ===\n');
  for (const m of models) {
    const methods = m.supportedGenerationMethods || [];
    if (methods.includes('generateContent')) {
      console.log(`✓ ${m.name}`);
    }
  }
} catch (err) {
  console.error('Error:', err.message);
}
