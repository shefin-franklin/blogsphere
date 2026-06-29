import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { env, isProd } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendEmail } from '../services/email/sendEmail.js';
import { auditLog } from '../middleware/audit.js';

const signAccess = (id) => jwt.sign({ id }, env.JWT_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY });
const signRefresh = (id) => jwt.sign({ id, jti: uuidv4() }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRY });

const setAuthCookies = (res, accessToken, refreshToken) => {
  const base = {
    httpOnly: true,
    secure: env.COOKIE_SECURE === 'true' || isProd,
    sameSite: env.COOKIE_SAMESITE || 'lax',
    path: '/',
  };
  res.cookie('access_token', accessToken, { ...base, maxAge: 15 * 60 * 1000 });
  res.cookie('refresh_token', refreshToken, { ...base, maxAge: 7 * 24 * 60 * 60 * 1000 });
};

export const register = asyncHandler(async (req, res) => {
  const { name, username, email, password } = req.body;
  if (await User.findOne({ $or: [{ email }, { username }] }))
    throw new ApiError(409, 'Email or username already exists');

  const user = await User.create({ name, username, email, password });
  const verifyToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  const verifyUrl = `${env.CLIENT_URL}/verify-email?token=${verifyToken}`;
  await sendEmail({ to: user.email, template: 'verifyEmail', data: { name, url: verifyUrl } });

  auditLog(req, user._id, 'user.register', { email });
  ApiResponse.created(res, { id: user._id, email: user.email }, 'Account created. Check email to verify.');
});

export const login = asyncHandler(async (req, res) => {
  const { email, password, remember } = req.body;
  const user = await User.findOne({ email }).select('+password +isLocked +loginAttempts +lockUntil');
  if (!user) throw new ApiError(401, 'Invalid credentials');

  if (user.isLocked && user.lockUntil > Date.now())
    throw new ApiError(423, `Account locked. Try in ${Math.ceil((user.lockUntil - Date.now()) / 60000)} min`);

  const match = await user.matchPassword(password);
  if (!match) {
    await user.incLoginAttempts();
    throw new ApiError(401, 'Invalid credentials');
  }

  await user.resetLoginAttempts();
  const accessToken = signAccess(user._id);
  const refreshToken = signRefresh(user._id);
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  await Session.create({
    user: user._id, refreshToken, ip: req.ip,
    userAgent: req.headers['user-agent'],
    expiresAt: new Date(Date.now() + (remember ? 30 : 7) * 86400000),
  });

  setAuthCookies(res, accessToken, refreshToken);
  auditLog(req, user._id, 'user.login');
  ApiResponse.success(res, {
    user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    accessToken,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token || req.body.refreshToken;
  if (!token) throw new ApiError(401, 'No refresh token');

  let decoded;
  try { decoded = jwt.verify(token, env.JWT_REFRESH_SECRET); }
  catch { throw new ApiError(401, 'Invalid refresh token'); }

  const session = await Session.findOne({ refreshToken: token, user: decoded.id, revoked: false });
  if (!session) throw new ApiError(401, 'Session expired');

  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) throw new ApiError(401, 'Account inactive');

  // Rotate refresh token
  session.revoked = true;
  await session.save();
  const newRefresh = signRefresh(user._id);
  await Session.create({ user: user._id, refreshToken: newRefresh, ip: req.ip, userAgent: req.headers['user-agent'], expiresAt: new Date(Date.now() + 7 * 86400000) });

  const accessToken = signAccess(user._id);
  setAuthCookies(res, accessToken, newRefresh);
  ApiResponse.success(res, { accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (token) await Session.updateOne({ refreshToken: token }, { revoked: true });
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  auditLog(req, req.user?._id, 'user.logout');
  ApiResponse.success(res, null, 200, 'Logged out');
});

export const me = asyncHandler(async (req, res) => {
  ApiResponse.success(res, { user: req.user });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return ApiResponse.success(res, null, 200, 'If that email exists, a reset link was sent');

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const url = `${env.CLIENT_URL}/reset-password?token=${resetToken}`;
  await sendEmail({ to: user.email, template: 'resetPassword', data: { name: user.name, url } });
  ApiResponse.success(res, null, 200, 'Reset link sent');
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({
    passwordResetToken: token,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, 'Invalid or expired token');
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.refreshToken = undefined;
  await Session.deleteMany({ user: user._id });
  await user.save();
  ApiResponse.success(res, null, 200, 'Password reset successfully');
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() },
  });
  if (!user) throw new ApiError(400, 'Invalid or expired token');
  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();
  ApiResponse.success(res, null, 200, 'Email verified');
});
