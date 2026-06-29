import mongoose from 'mongoose';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    excerpt: { type: String, maxlength: 500 },
    content: { type: String, default: '' },
    contentHtml: { type: String, default: '' },

    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],

    coverImage: { url: String, publicId: String, alt: String, caption: String },

    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'archived', 'trash'],
      default: 'draft',
      index: true,
    },
    publishedAt: Date,
    scheduledAt: Date,

    isFeatured: { type: Boolean, default: false, index: true },
    isSticky: { type: Boolean, default: false },
    isPinned: { type: Boolean, default: false },

    readingTime: { type: Number, default: 0 }, // minutes
    wordCount: { type: Number, default: 0 },

    // SEO
    seo: {
      metaTitle: { type: String, maxlength: 70 },
      metaDescription: { type: String, maxlength: 170 },
      canonicalUrl: String,
      focusKeyword: String,
      keywords: [String],
      ogTitle: String,
      ogDescription: String,
      ogImage: String,
      twitterCard: { type: String, enum: ['summary', 'summary_large_image'], default: 'summary_large_image' },
      robots: { type: String, default: 'index, follow' },
      jsonLd: mongoose.Schema.Types.Mixed,
      seoScore: { type: Number, default: 0, min: 0, max: 100 },
      readabilityScore: { type: Number, default: 0, min: 0, max: 100 },
    },

    // Versions / History
    versions: [
      {
        content: String,
        contentHtml: String,
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        editedAt: { type: Date, default: Date.now },
        note: String,
        version: Number,
      },
    ],
    currentVersion: { type: Number, default: 1 },

    // Stats
    views: { type: Number, default: 0 },
    uniqueVisitors: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    bookmarks: { type: Number, default: 0 },

    // AI meta
    aiMeta: {
      generatedBy: { type: String, default: 'human' },
      aiAssisted: { type: Boolean, default: false },
      geminiTokensUsed: { type: Number, default: 0 },
    },

    allowComments: { type: Boolean, default: true },
    deletedAt: Date,
  },
  { timestamps: true }
);

blogSchema.index({ title: 'text', excerpt: 'text', content: 'text' });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ category: 1, status: 1 });
blogSchema.index({ slug: 1 }, { unique: true });

blogSchema.virtual('url').get(function () {
  return `/blog/${this.slug}`;
});

blogSchema.set('toJSON', { virtuals: true });
blogSchema.set('toObject', { virtuals: true });

export default mongoose.model('Blog', blogSchema);
