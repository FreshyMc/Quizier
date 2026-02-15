import { GameStatus } from './model-enums.js';
import { model, Schema, type InferSchemaType } from 'mongoose';

const playerSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true, trim: true },
    score: { type: Number, default: 0, min: 0 },
    isConnected: { type: Boolean, default: true },
  },
  { _id: false },
);

const gameSettingsSchema = new Schema(
  {
    maxPlayers: { type: Number, default: 4, min: 2 },
    roundsPerPlayer: { type: Number, required: true, min: 1 },
    timePerTurn: { type: Number, default: 30, min: 5 },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category', required: true }],
  },
  { _id: false },
);

const roundQuestionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    answeredBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    selectedOption: { type: Number, min: 0, max: 3, default: null },
    isCorrect: { type: Boolean, default: false },
    timeSpent: { type: Number, min: 0, default: 0 },
  },
  { _id: false },
);

const roundSchema = new Schema(
  {
    roundNumber: { type: Number, required: true, min: 1 },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    questions: { type: [roundQuestionSchema], default: [] },
  },
  { _id: false },
);

const gameSessionSchema = new Schema(
  {
    roomCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 6,
      maxlength: 6,
      match: /^[A-Z0-9]{6}$/,
    },
    hostId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    players: { type: [playerSchema], default: [] },
    status: {
      type: String,
      enum: Object.values(GameStatus),
      default: GameStatus.WAITING,
      required: true,
    },
    settings: { type: gameSettingsSchema, required: true },
    rounds: { type: [roundSchema], default: [] },
    currentRound: { type: Number, default: 0, min: 0 },
    currentTurnPlayerIndex: { type: Number, default: 0, min: 0 },
    winnerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  {
    timestamps: true,
  },
);

gameSessionSchema.index({ roomCode: 1 }, { unique: true });

export type GameSession = InferSchemaType<typeof gameSessionSchema>;
export const GameSessionModel = model('GameSession', gameSessionSchema);
