import mongoose from 'mongoose';

const usageSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    action: { type: String, required: true, index: true },
    model: String,
    tokensEstimate: { type: Number, default: 0 },
    latencyMs: Number,
    success: { type: Boolean, default: true },
    error: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

usageSchema.index({ createdAt: -1 });
usageSchema.index({ user: 1, createdAt: -1 });

const AIUsage = mongoose.model('AIUsage', usageSchema);

export const UsageLogger = {
  async log(entry) {
    try {
      const start = entry.startedAt ? Date.now() - entry.startedAt : undefined;
      await AIUsage.create({
        user: entry.userId,
        action: entry.action,
        tokensEstimate: entry.tokensEstimate || 0,
        latencyMs: start,
        success: entry.success ?? true,
        error: entry.error,
        metadata: entry.metadata,
      });
    } catch (e) {
      // Never throw on usage log
      console.error('UsageLogger error:', e.message);
    }
  },

  async stats(userId, range = '7d') {
    const since = new Date(Date.now() - (range === '24h' ? 86400000 : 7 * 86400000));
    return AIUsage.aggregate([
      { $match: { user: userId ? new mongoose.Types.ObjectId(userId) : { $exists: true }, createdAt: { $gte: since } } },
      { $group: { _id: '$action', count: { $sum: 1 }, tokens: { $sum: '$tokensEstimate' }, failures: { $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] } } } },
      { $sort: { count: -1 } },
    ]);
  },
};
