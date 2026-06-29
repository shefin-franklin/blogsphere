import jwt from 'jsonwebtoken';
import { CookieAccess } from '../utils/cookieAccess.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const protect = asyncHandler(async (req, res, next) => {
  let token;
  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies?.access_token) {
    token = req.cookies.access_token;
  }
  if (!token) throw new ApiError(401, 'Not authenticated');

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new ApiError(401, 'Account inactive');
    if (user.passwordChangedAt && decoded.iat * 1000 < user.passwordChangedAt.getTime())
      throw new ApiError(401, 'Session expired, please login again');
    req.user = user;
    next();
  } catch (err) {
    throw new ApiError(401, 'Invalid or expired token');
  }
});

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (!roles.includes(req.user.role))
    return next(new ApiError(403, `Requires role: ${roles.join(' or ')}`));
  next();
};

export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    if (req.cookies?.access_token || req.headers.authorization?.startsWith('Bearer ')) {
      await protect(req, res, () => {});
    }
  } catch {}
  next();
});

// Permission matrix
export const can = (action) => (req, res, next) => {
  const matrix = {
    super_admin: ['*'],
    admin: ['blog:*', 'category:*', 'tag:*', 'media:*', 'comment:*', 'user:read', 'ai:*', 'settings:*'],
    editor: ['blog:*', 'category:read', 'tag:read', 'media:*', 'comment:*', 'ai:*'],
    author: ['blog:write', 'blog:read_own', 'media:write_own', 'comment:read', 'ai:limited'],
  };
  const perms = matrix[req.user.role] || [];
  if (perms.includes('*') || perms.includes(action)) return next();
  return next(new ApiError(403, 'Insufficient permissions'));
};
