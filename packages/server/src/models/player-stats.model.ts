import { model, Schema, type InferSchemaType } from 'mongoose';

const categoryStatSchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    totalCorrect: { type: Number, default: 0, min: 0 },
    totalAnswered: { type: Number, default: 0, min: 0 },
    accuracy: { type: Number, default: 0, min: 0, max: 100 },
  },
  { _id: false },
);

const playerStatsSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    totalGamesPlayed: { type: Number, default: 0, min: 0 },
    totalGamesWon: { type: Number, default: 0, min: 0 },
    totalCorrectAnswers: { type: Number, default: 0, min: 0 },
    totalAnswered: { type: Number, default: 0, min: 0 },
    winRate: { type: Number, default: 0, min: 0, max: 100 },
    avgAccuracy: { type: Number, default: 0, min: 0, max: 100 },
    categoryStats: { type: [categoryStatSchema], default: [] },
  },
  {
    timestamps: true,
  },
);

playerStatsSchema.index({ userId: 1 }, { unique: true });

export type PlayerStats = InferSchemaType<typeof playerStatsSchema>;
export const PlayerStatsModel = model('PlayerStats', playerStatsSchema);
