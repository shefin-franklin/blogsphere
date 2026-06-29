import { GeminiProvider } from './GeminiProvider.js';
import { PromptTemplates } from './PromptTemplates.js';
import { UsageLogger } from './UsageLogger.js';
import { logger } from '../../utils/logger.js';

let _provider = null;

export function getAIProvider() {
  if (!_provider) _provider = new GeminiProvider();
  return _provider;
}

export function setAIProvider(p) { _provider = p; }

const safeJSON = (text) => {
  if (!text) return null;
  // Strip code fences
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(cleaned); }
  catch { 
    const m = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    return null;
  }
};

export const AIService = {
  async generateBlog(topic, opts = {}, userId) {
    const prompt = PromptTemplates.generateBlog(topic, opts);
    const result = await this._run(prompt, { temperature: 0.8, maxTokens: 4096 }, userId, 'generateBlog');
    return { content: result };
  },

  async continueWriting(existing, hint, userId) {
    return this._run(PromptTemplates.continueWriting(existing, hint), { temperature: 0.7 }, userId, 'continueWriting');
  },

  async rewriteParagraph(p, style, userId) {
    return this._run(PromptTemplates.rewriteParagraph(p, style), { temperature: 0.6 }, userId, 'rewriteParagraph');
  },

  improveWriting: (t, u) => AIService._run(PromptTemplates.improveWriting(t), { temperature: 0.5 }, u, 'improveWriting'),
  fixGrammar: (t, u) => AIService._run(PromptTemplates.fixGrammar(t), { temperature: 0.2 }, u, 'fixGrammar'),
  humanizeText: (t, u) => AIService._run(PromptTemplates.humanizeText(t), { temperature: 0.8 }, u, 'humanizeText'),
  expandContent: (t, u) => AIService._run(PromptTemplates.expandContent(t), { temperature: 0.7 }, u, 'expandContent'),
  shortenContent: (t, u) => AIService._run(PromptTemplates.shortenContent(t), { temperature: 0.4 }, u, 'shortenContent'),
  simplifyContent: (t, u) => AIService._run(PromptTemplates.simplifyContent(t), { temperature: 0.5 }, u, 'simplifyContent'),

  async *streamGenerate(topic, opts, userId) {
    const provider = getAIProvider();
    const prompt = PromptTemplates.generateBlog(topic, opts);
    try {
      for await (const chunk of provider.stream({ prompt, temperature: 0.8 })) {
        yield chunk;
      }
      await UsageLogger.log({ userId, action: 'streamGenerateBlog', tokensEstimate: topic.length / 4 + 500, success: true });
    } catch (err) {
      await UsageLogger.log({ userId, action: 'streamGenerateBlog', success: false, error: err.message });
      throw err;
    }
  },

  async seoPackage(title, content, focusKeyword, userId) {
    const raw = await this._run(
      PromptTemplates.seoPackage(title, content, focusKeyword),
      { temperature: 0.4, maxTokens: 2048, json: true },
      userId, 'seoPackage'
    );
    return safeJSON(raw) || { error: 'Failed to parse SEO response', raw };
  },

  async trendDiscovery(niche, recentBlogs, userId) {
    const raw = await this._run(
      PromptTemplates.trendDiscovery(niche, recentBlogs),
      { temperature: 0.7, maxTokens: 4096, json: true },
      userId, 'trendDiscovery'
    );
    return safeJSON(raw) || { error: 'Failed to parse trends', raw };
  },

  async contentIntel(title, content, focusKeyword, userId) {
    const raw = await this._run(
      PromptTemplates.contentIntel(title, content, focusKeyword),
      { temperature: 0.3, maxTokens: 2048, json: true },
      userId, 'contentIntel'
    );
    return safeJSON(raw) || { error: 'Failed to parse content intel', raw };
  },

  async slugSuggestions(title, userId) {
    const raw = await this._run(
      PromptTemplates.slugSuggestions(title),
      { temperature: 0.4, maxTokens: 256, json: true },
      userId, 'slugSuggestions'
    );
    const parsed = safeJSON(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  },

  async _run(prompt, opts, userId, action) {
    const provider = getAIProvider();
    try {
      const text = await provider.generate({ prompt, ...opts });
      await UsageLogger.log({
        userId, action,
        tokensEstimate: Math.ceil((prompt.length + text.length) / 4),
        success: true,
      });
      return text;
    } catch (err) {
      logger.error(`AI action ${action} failed: ${err.message}`);
      await UsageLogger.log({ userId, action, success: false, error: err.message });
      throw err;
    }
  },
};
