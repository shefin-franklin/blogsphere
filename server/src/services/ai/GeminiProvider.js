import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIProvider } from './AIProvider.js';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { sleep } from '../../utils/sleep.js';

export class GeminiProvider extends AIProvider {
  constructor(opts = {}) {
    super({ model: env.GEMINI_MODEL, maxRetries: env.GEMINI_MAX_RETRIES, ...opts });
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing');
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    this.modelName = opts.model || env.GEMINI_MODEL;
    this.lastRateLimitedAt = 0;
  }

  _getModel() {
    return this.client.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
  }

  isRateLimited(err) {
    if (!err) return false;
    const msg = err.message || '';
    return (
      err.status === 429 ||
      msg.includes('429') ||
      msg.toLowerCase().includes('rate limit') ||
      msg.toLowerCase().includes('quota')
    );
  }

  async generate({ prompt, system, temperature, maxTokens, json }) {
    const model = this._getModel();
    if (system) model.generationConfig.systemInstruction = system;
    if (temperature != null) model.generationConfig.temperature = temperature;
    if (maxTokens != null) model.generationConfig.maxOutputTokens = maxTokens;
    if (json) {
      model.generationConfig.responseMimeType = 'application/json';
    }

    let lastErr;
    for (let attempt = 0; attempt <= this.opts.maxRetries; attempt++) {
      try {
        // Wait if we recently hit a rate limit (exponential backoff)
        if (this.lastRateLimitedAt) {
          const wait = Math.min(60000, 2 ** attempt * 1000);
          if (Date.now() - this.lastRateLimitedAt < wait) await sleep(wait);
        }

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        this.lastRateLimitedAt = 0;
        return text;
      } catch (err) {
        lastErr = err;
        logger.warn(`Gemini attempt ${attempt + 1} failed: ${err.message}`);

        if (this.isRateLimited(err)) {
          this.lastRateLimitedAt = Date.now();
          const backoff = Math.min(30000, 2 ** attempt * 1500);
          await sleep(backoff);
          continue;
        }
        // Non-retryable error
        break;
      }
    }
    throw lastErr;
  }

  async *stream({ prompt, system, temperature }) {
    const model = this._getModel();
    if (system) model.generationConfig.systemInstruction = system;
    if (temperature != null) model.generationConfig.temperature = temperature;

    try {
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    } catch (err) {
      if (this.isRateLimited(err)) {
        logger.warn('Gemini stream rate-limited, falling back to non-stream');
        const text = await this.generate({ prompt, system, temperature });
        yield text;
        return;
      }
      throw err;
    }
  }
}
