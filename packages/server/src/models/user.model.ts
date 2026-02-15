import { UserRole } from './model-enums.js';
import { model, Schema, type InferSchemaType } from 'mongoose';

const userStatsSchema = new Schema(
  {
    gamesPlayed: { type: Number, default: 0, min: 0 },
    gamesWon: { type: Number, default: 0, min: 0 },
    totalCorrect: { type: Number, default: 0, min: 0 },
    totalAnswered: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.PLAYER,
      required: true,
    },
    oauthProviders: { type: [String], default: [] },
    stats: { type: userStatsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model('User', userSchema);
