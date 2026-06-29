import { Router } from 'express';
import { protect, can } from '../middleware/auth.js';
import * as ai from '../controllers/ai.controller.js';

const router = Router();
router.use(protect, can('ai:limited'));

router.post('/generate', ai.generateBlog);
router.post('/generate/stream', ai.streamGenerate);
router.post('/writing', ai.writingAction);
router.post('/seo', ai.seoPackage);
router.post('/content-intel', ai.contentIntel);
router.post('/slug-suggestions', ai.slugSuggestions);
router.get('/trends', ai.trendDiscovery);
router.get('/usage', ai.usageStats);

export default router;
