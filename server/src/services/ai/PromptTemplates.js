export const PromptTemplates = {
  // ===== Writing Assistant =====
  generateBlog: (topic, opts = {}) => `
Write a complete, SEO-optimized blog post about: "${topic}".
Requirements:
- Word count: ${opts.wordCount || 1200}
- Tone: ${opts.tone || 'professional yet approachable'}
- Audience: ${opts.audience || 'general technical readers'}
- Use H2 and H3 headings, bullet points where appropriate
- Include an engaging introduction
- Provide a strong conclusion with a call to action
- Output as clean HTML (no <html>, <head>, or <body> tags)
- Include image placeholder comments like <!-- IMG: descriptive alt text -->
 ${opts.includeFAQ ? '- Include an FAQ section at the end' : ''}
 ${opts.includeTOC ? '- Include a table of contents at the top' : ''}
`,
  continueWriting: (existingContent, hint) => `
Continue the following blog post naturally, matching its tone, style, and formatting.
 ${hint ? `Direction: ${hint}` : ''}

EXISTING CONTENT:
 ${existingContent}

Continue from where it left off. Output only the continuation as HTML.
`,

  rewriteParagraph: (paragraph, style) => `
Rewrite this paragraph in a ${style} style. Keep the meaning intact but transform the prose.
Output only the rewritten paragraph as HTML.

PARAGRAPH:
 ${paragraph}
`,

  improveWriting: (text) => `
Improve the following text's clarity, flow, and impact. Fix awkward phrasing, strengthen verbs, vary sentence structure. Preserve meaning and HTML structure.

TEXT:
 ${text}
`,

  fixGrammar: (text) => `
Fix all grammar, spelling, and punctuation errors in the following text. Output only the corrected text preserving HTML structure.

TEXT:
 ${text}
`,

  humanizeText: (text) => `
Rewrite this AI-generated text to sound more human and natural. Vary sentence length, add conversational rhythm, remove robotic patterns, use contractions. Preserve meaning and HTML structure.

TEXT:
 ${text}
`,

  expandContent: (text) => `
Expand the following content with additional detail, examples, and depth. Don't introduce unrelated topics. Preserve HTML structure.

TEXT:
 ${text}
`,

  shortenContent: (text) => `
Shorten the following content by 30-50% while preserving key information and HTML structure. Remove redundancy and fluff.

TEXT:
 ${text}
`,

  simplifyContent: (text) => `
Simplify the following content so a beginner can understand it. Replace jargon, add brief explanations, use analogies where helpful. Preserve HTML structure.

TEXT:
 ${text}
`,

  // ===== SEO =====
  seoPackage: (title, content, focusKeyword) => `
You are an expert SEO strategist. Analyze this blog and return ONLY valid JSON (no markdown fences, no prose).

BLOG TITLE: ${title}
FOCUS KEYWORD: ${focusKeyword || 'auto-detect'}
CONTENT SNIPPET: ${content.slice(0, 4000)}

Return this exact JSON shape:
{
  "metaTitle": "string <= 60 chars, includes focus keyword near front",
  "metaDescription": "string 150-160 chars, compelling, includes focus keyword",
  "focusKeyword": "string",
  "longTailKeywords": ["string", ...],
  "relatedKeywords": ["string", ...],
  "tags": ["string", ...],
  "suggestedCategory": "string",
  "faqs": [{"question": "string", "answer": "string"}, ...],
  "callToAction": "string",
  "summary": "string <= 200 chars",
  "excerpt": "string <= 300 chars",
  "socialCaption": "string for social media",
  "ogDescription": "string <= 160 chars",
  "twitterDescription": "string <= 200 chars",
  "seoScore": number 0-100,
  "suggestions": ["actionable improvement string", ...]
}
`,

  // ===== Trends =====
  trendDiscovery: (niche, recentBlogs = []) => `
You are a content strategist specializing in "${niche || 'technology and business'}".
Return ONLY valid JSON (no markdown, no prose).

 ${recentBlogs.length ? `EXISTING PUBLISHED BLOGS (avoid duplicates): ${recentBlogs.join(', ')}` : ''}

Return this exact JSON shape:
{
  "trendingTopics": [{"title": "...", "rationale": "...", "searchVolume": "low|medium|high", "difficulty": "low|medium|high"}],
  "viralIdeas": [{"title": "...", "hook": "...", "angle": "..."}],
  "seasonalTopics": [{"title": "...", "timing": "...", "rationale": "..."}],
  "evergreenContent": [{"title": "...", "longevity": "...", "rationale": "..."}],
  "nicheTopics": [{"title": "...", "audience": "...", "rationale": "..."}],
  "relatedArticles": [{"title": "...", "relation": "..."}],
  "blogSeries": [{"seriesTitle": "...", "parts": ["...", "..."], "rationale": "..."}],
  "contentGaps": [{"gap": "...", "opportunity": "..."}],
  "contentClusters": [{"pillar": "...", "clusterTopics": ["..."]}],
  "popularQuestions": [{"question": "...", "searchIntent": "informational|transactional|navigational"}],
  "keywordsToTarget": [{"keyword": "...", "volume": "low|medium|high", "competition": "low|medium|high"}],
  "competitorInspired": [{"idea": "...", "differentiation": "..."}],
  "basedOnExisting": [{"title": "...", "basedOn": "...", "angle": "..."}]
}
`,

  // ===== Content Intelligence =====
  contentIntel: (title, content, focusKeyword) => `
You are a content quality auditor. Return ONLY valid JSON.

BLOG TITLE: ${title}
FOCUS KEYWORD: ${focusKeyword || ''}
CONTENT: ${content}

Return:
{
  "duplicateContentRisk": "low|medium|high",
  "duplicateContentNotes": "string",
  "readabilityScore": number 0-100,
  "readabilityLevel": "string (e.g. 8th grade)",
  "qualityScore": number 0-100,
  "seoScore": number 0-100,
  "engagementPrediction": "low|medium|high",
  "engagementNotes": "string",
  "wordCount": number,
  "readingTimeMinutes": number,
  "headingAnalysis": {"h1Count": n, "h2Count": n, "h3Count": n, "issues": ["..."]},
  "internalLinkSuggestions": [{"anchor": "...", "suggestedTopic": "..."}],
  "externalLinkSuggestions": [{"anchor": "...", "suggestedSource": "..."}],
  "missingKeywords": ["..."],
  "actionItems": ["..."]
}
`,

  // ===== Slug =====
  slugSuggestions: (title) => `
Generate 5 SEO-friendly URL slugs for this blog title. Return ONLY a JSON array of strings, each 3-8 words, lowercase, hyphenated, no stop words.

TITLE: ${title}
`,
};
