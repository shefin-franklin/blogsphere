import mongoose from 'mongoose';

const redirectSchema = new mongoose.Schema(
  {
    fromSlug: { type: String, required: true, unique: true, lowercase: true, index: true },
    toSlug: { type: String, required: true },
    blog: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog' },
    statusCode: { type: Number, default: 301, enum: [301, 302] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hits: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Redirect', redirectSchema);
