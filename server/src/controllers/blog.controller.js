// server/src/controllers/blog.controller.js
import Blog from '../models/Blog.js';
import Redirect from '../models/Redirect.js';
import Category from '../models/Category.js';
import Tag from '../models/Tag.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { slugify } from '../utils/slugify.js';
import { calculateReadingTime } from '../utils/readingTime.js';
import { RESERVED_SLUGS } from '../utils/constants.js';
import mongoose from 'mongoose';

const buildQuery = (req) => {
  const q = {};
  if (req.query.status) q.status = req.query.status;
  if (req.query.category) q.category = req.query.category;
  if (req.query.author) q.author = req.query.author;
  if (req.query.tag) q.tags = req.query.tag;
  if (req.query.search) q.$text = { $search: req.query.search };
  if (req.query.featured === 'true') q.isFeatured = true;
  return q;
};

export const list = asyncHandler(async (req, res) => {
  const page = +req.query.page || 1;
  const limit = Math.min(+req.query.limit || 20, 100);
  const sort = req.query.sort || '-createdAt';
  const q = buildQuery(req);

  // Authors only see their own drafts
  if (req.user && req.user.role === 'author') {
    q.$or = [{ status: 'published' }, { author: req.user._id }];
  } else if (!req.user) {
    q.status = 'published';
  }

  const [items, total] = await Promise.all([
    Blog.find(q).populate('author', 'name username avatar').populate('category', 'name slug').populate('tags', 'name slug').sort(sort).skip((page - 1) * limit).limit(limit).lean(),
    Blog.countDocuments(q),
  ]);
  ApiResponse.paginate(res, { items, total, page, pages: Math.ceil(total / limit), limit });
});

export const getBySlug = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug, status: { $in: ['published', 'scheduled'] } })
    .populate('author', 'name username avatar bio social')
    .populate('category', 'name slug')
    .populate('tags', 'name slug')
    .lean();

  if (!blog) {
    // Check redirects
    const redirect = await Redirect.findOne({ fromSlug: req.params.slug });
    if (redirect) {
      redirect.hits += 1;
      await redirect.save();
      return res.redirect(redirect.statusCode, `/api/v1/blogs/slug/${redirect.toSlug}`);
    }
    throw new ApiError(404, 'Blog not found');
  }

  // Increment views
  await Blog.updateOne({ _id: blog._id }, { $inc: { views: 1 } });
  ApiResponse.success(res, blog);
});

export const create = asyncHandler(async (req, res) => {
  const { title, content, contentHtml, category, tags, status, slug, coverImage, seo, scheduledAt, excerpt } = req.body;

  let finalSlug = slug ? slugify(slug) : slugify(title);
  if (RESERVED_SLUGS.includes(finalSlug)) throw new ApiError(400, 'Slug is reserved');
  if (await Blog.exists({ slug: finalSlug })) throw new ApiError(409, 'Slug already taken');

  const wordCount = (content || '').split(/\s+/).filter(Boolean).length;
  const blog = await Blog.create({
    title, slug: finalSlug, content, contentHtml, excerpt,
    author: req.user._id,
    category: category || null,
    tags: tags || [],
    status: status || 'draft',
    coverImage,
    seo: seo || {},
    scheduledAt,
    readingTime: calculateReadingTime(content),
    wordCount,
  });

  ApiResponse.created(res, blog);
});

export const update = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  if (!blog) throw new ApiError(404, 'Blog not found');

  // Author ownership check
  if (req.user.role === 'author' && blog.author.toString() !== req.user._id.toString())
    throw new ApiError(403, 'Not your blog');

  const oldSlug = blog.slug;
  const body = req.body;

  // Slug change handling — create 301 redirect
  if (body.slug && body.slug !== oldSlug) {
    const newSlug = slugify(body.slug);
    if (RESERVED_SLUGS.includes(newSlug)) throw new ApiError(400, 'Slug reserved');
    if (await Blog.exists({ slug: newSlug, _id: { $ne: blog._id } })) throw new ApiError(409, 'Slug taken');
    if (oldSlug && oldSlug !== newSlug) {
      await Redirect.create({ fromSlug: oldSlug, toSlug: newSlug, blog: blog._id, createdBy: req.user._id });
    }
    blog.slug = newSlug;
  }

  // Version history on content change
  if (body.content && body.content !== blog.content) {
    blog.versions.push({
      content: blog.content,
      contentHtml: blog.contentHtml,
      editedBy: req.user._id,
      version: blog.currentVersion,
      note: body.versionNote || 'Auto-versioned',
    });
    blog.currentVersion += 1;
    blog.content = body.content;
    blog.contentHtml = body.contentHtml || blog.contentHtml;
    blog.wordCount = (body.content || '').split(/\s+/).filter(Boolean).length;
    blog.readingTime = calculateReadingTime(body.content);
  }

  ['title', 'excerpt', 'coverImage', 'scheduledAt', 'isFeatured', 'isSticky', 'isPinned', 'allowComments'].forEach((f) => {
    if (body[f] !== undefined) blog[f] = body[f];
  });

  if (body.seo) blog.seo = { ...blog.seo, ...body.seo };
  if (body.category !== undefined) blog.category = body.category;
  if (body.tags !== undefined) blog.tags = body.tags;

  // Status transitions
  if (body.status && body.status !== blog.status) {
    if (body.status === 'published' && !blog.publishedAt) blog.publishedAt = new Date();
    blog.status = body.status;
  }

  await blog.save();
  ApiResponse.success(res, blog);
});

export const autosave = asyncHandler(async (req, res) => {
  const { content, contentHtml, title } = req.body;
  let blog = await Blog.findById(req.params.id);
  if (!blog) throw new ApiError(404, 'Blog not found');
  blog.content = content;
  blog.contentHtml = contentHtml;
  if (title) blog.title = title;
  await blog.save();
  ApiResponse.success(res, { savedAt: new Date(), version: blog.currentVersion });
});

export const restoreVersion = asyncHandler(async (req, res) => {
  const blog = await Blog.findById(req.params.id);
  const version = blog.versions.id(req.params.versionId);
  if (!version) throw new ApiError(404, 'Version not found');
  blog.versions.push({ content: blog.content, contentHtml: blog.contentHtml, editedBy: req.user._id, version: blog.currentVersion, note: 'Pre-restore backup' });
  blog.currentVersion += 1;
  blog.content = version.content;
  blog.contentHtml = version.contentHtml;
  await blog.save();
  ApiResponse.success(res, blog);
});

export const remove = asyncHandler(async (req, res) => {
  const { permanent } = req.query;
  const blog = await Blog.findById(req.params.id);
  if (!blog) throw new ApiError(404, 'Blog not found');
  if (permanent === 'true') {
    await blog.deleteOne();
    await Redirect.deleteMany({ blog: blog._id });
  } else {
    blog.status = 'trash';
    blog.deletedAt = new Date();
    await blog.save();
  }
  ApiResponse.noContent(res);
});

export const clone = asyncHandler(async (req, res) => {
  const original = await Blog.findById(req.params.id);
  if (!original) throw new ApiError(404, 'Blog not found');
  const copy = original.toObject();
  delete copy._id; delete copy.__v; delete copy.slug; delete copy.views;
  copy.title = `${original.title} (Copy)`;
  copy.slug = slugify(copy.title) + '-' + Date.now().toString(36);
  copy.status = 'draft';
  copy.author = req.user._id;
  copy.publishedAt = null;
  const cloned = await Blog.create(copy);
  ApiResponse.created(res, cloned);
});

export const pin = asyncHandler(async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(req.params.id, { isPinned: true }, { new: true });
  ApiResponse.success(res, blog);
});
