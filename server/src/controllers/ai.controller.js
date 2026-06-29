import { AIService } from '../services/ai/AIService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { aiRateLimiter } from '../middleware/rateLimit.js';

export const generateBlog = [
  aiRateLimiter,
  asyncHandler(async (req, res) => {
    const { topic, tone, audience, wordCount, includeFAQ, includeTOC } = req.body;
    if (!topic?.trim()) throw new ApiError(400, 'Topic required');
    const result = await AIService.generateBlog(topic, { tone, audience, wordCount, includeFAQ, includeTOC }, req.user._id);
    ApiResponse.success(res, result);
  }),
];

export const streamGenerate = [
  aiRateLimiter,
  asyncHandler(async (req, res) => {
    const { topic, tone, audience } = req.body;
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const chunk of AIService.streamGenerate(topic, { tone, audience }, req.user._id)) {
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }),
];

export const writingAction = asyncHandler(async (req, res) => {
  const { action, text, style, hint } = req.body;
  const map = {
    continue: () => AIService.continueWriting(text, hint, req.user._id),
    rewriteParagraph: () => AIService.rewriteParagraph(text, style, req.user._id),
    improve: () => AIService.improveWriting(text, req.user._id),
    grammar: () => AIService.fixGrammar(text, req.user._id),
    humanize: () => AIService.humanizeText(text, req.user._id),
    expand: () => AIService.expandContent(text, req.user._id),
    shorten: () => AIService.shortenContent(text, req.user._id),
    simplify: () => AIService.simplifyContent(text, req.user._id),
  };
  const fn = map[action];
  if (!fn) throw new ApiError(400, `Unknown action: ${action}`);
  const result = await fn();
  ApiResponse.success(res, { content: result });
});

export const seoPackage = asyncHandler(async (req, res) => {
  const { title, content, focusKeyword } = req.body;
  if (!title || !content) throw new ApiError(400, 'Title and content required');
  const result = await AIService.seoPackage(title, content, focusKeyword, req.user._id);
  ApiResponse.success(res, result);
});

export const trendDiscovery = asyncHandler(async (req, res) => {
  const { niche } = req.query;
  const result = await AIService.trendDiscovery(niche, [], req.user._id);
  ApiResponse.success(res, result);
});

export const contentIntel = asyncHandler(async (req, res) => {
  const { title, content, focusKeyword } = req.body;
  const result = await AIService.contentIntel(title, content, focusKeyword, req.user._id);
  ApiResponse.success(res, result);
});

export const slugSuggestions = asyncHandler(async (req, res) => {
  const { title } = req.body;
  const slugs = await AIService.slugSuggestions(title, req.user._id);
  ApiResponse.success(res, { slugs });
});

export const usageStats = asyncHandler(async (req, res) => {
  const stats = await import('../services/ai/UsageLogger.js').then(m => m.UsageLogger.stats(req.user._id, req.query.range));
  ApiResponse.success(res, stats);
});
