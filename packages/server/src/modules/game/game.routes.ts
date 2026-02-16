import type { FastifyPluginAsync } from 'fastify';
import { GameStatus, createGameSchema } from '@quizier/shared';
import { Types } from 'mongoose';

import { CategoryModel } from '../../models/category.model.js';
import { GameSessionModel } from '../../models/game-session.model.js';
import { PlayerStatsModel } from '../../models/player-stats.model.js';
import { UserModel } from '../../models/user.model.js';
import { formatValidationErrorMessage } from '../../utils/validation.js';
import { authenticate } from '../auth/auth.middleware.js';
import { createGameSession, startGameFromRest } from './game.socket.js';

const createHttpError = (statusCode: number, message: string) => {
  const error = new Error(message) as Error & { statusCode: number };
  error.statusCode = statusCode;
  return error;
};

const findGameSessionByIdentifier = async (identifierInput: string) => {
  const identifier = identifierInput.trim();

  if (Types.ObjectId.isValid(identifier)) {
    const byId = await GameSessionModel.findById(identifier);
    if (byId) {
      return byId;
    }
  }

  return GameSessionModel.findOne({ roomCode: identifier.toUpperCase() });
};

const serializeGame = (session: {
  _id?: Types.ObjectId;
  roomCode: string;
  hostId: Types.ObjectId;
  status: string;
  players: Array<{ userId: Types.ObjectId; username: string; score: number; isConnected: boolean }>;
  settings: {
    maxPlayers: number;
    roundsPerPlayer: number;
    timePerTurn: number;
    categories: Types.ObjectId[];
  };
  currentRound: number;
  winnerId?: Types.ObjectId | null;
  createdAt?: Date;
  updatedAt?: Date;
}) => ({
  id: session._id?.toString() ?? '',
  roomCode: session.roomCode,
  hostId: session.hostId.toString(),
  status: session.status,
  players: session.players.map((player) => ({
    userId: player.userId.toString(),
    username: player.username,
    score: player.score,
    isConnected: player.isConnected,
  })),
  settings: {
    maxPlayers: session.settings.maxPlayers,
    roundsPerPlayer: session.settings.roundsPerPlayer,
    timePerTurn: session.settings.timePerTurn,
    categories: session.settings.categories.map((categoryId) => categoryId.toString()),
  },
  currentRound: session.currentRound,
  winnerId: session.winnerId?.toString() ?? null,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

const gameRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/games', { preHandler: [authenticate] }, async (request) => {
    const parsed = createGameSchema.safeParse(request.body);
    if (!parsed.success) {
      throw createHttpError(400, formatValidationErrorMessage(parsed.error));
    }

    for (const categoryId of parsed.data.categories) {
      if (!Types.ObjectId.isValid(categoryId)) {
        throw createHttpError(400, 'Invalid category id in categories');
      }
    }

    const categoryCount = await CategoryModel.countDocuments({
      _id: { $in: parsed.data.categories },
      isActive: true,
    });

    if (categoryCount !== parsed.data.categories.length) {
      throw createHttpError(400, 'Some categories are missing or inactive');
    }

    const host = await UserModel.findById(request.user.id).select('username').lean();
    if (!host) {
      throw createHttpError(401, 'User not found');
    }

    const gameSession = await createGameSession({
      hostId: request.user.id,
      hostUsername: host.username,
      maxPlayers: parsed.data.maxPlayers,
      roundsPerPlayer: parsed.data.roundsPerPlayer,
      timePerTurn: parsed.data.timePerTurn,
      categories: parsed.data.categories,
    });

    return {
      roomCode: gameSession.roomCode,
      game: serializeGame(gameSession.toObject()),
    };
  });

  fastify.post('/api/games/:gameId/start', { preHandler: [authenticate] }, async (request) => {
    const gameId = (request.params as { gameId: string }).gameId;
    const gameSession = await findGameSessionByIdentifier(gameId);
    if (!gameSession) {
      throw createHttpError(404, 'Game session not found');
    }

    await startGameFromRest(fastify, gameSession.roomCode, request.user.id);

    const started = await findGameSessionByIdentifier(gameId);
    if (!started) {
      throw createHttpError(404, 'Game session not found');
    }

    return {
      game: serializeGame(started.toObject()),
    };
  });

  fastify.get('/api/games/history', { preHandler: [authenticate] }, async (request) => {
    const sessions = await GameSessionModel.find({
      'players.userId': request.user.id,
      status: GameStatus.FINISHED,
    })
      .sort({ updatedAt: -1 })
      .limit(50)
      .lean();

    return {
      games: sessions.map((session) => serializeGame(session)),
    };
  });

  fastify.get('/api/games/:gameId', { preHandler: [authenticate] }, async (request) => {
    const gameId = (request.params as { gameId: string }).gameId;
    const gameSession = await findGameSessionByIdentifier(gameId);
    if (!gameSession) {
      throw createHttpError(404, 'Game session not found');
    }

    return {
      game: serializeGame(gameSession.toObject()),
    };
  });

  fastify.get('/api/leaderboard', async () => {
    const leaderboard = await PlayerStatsModel.find({})
      .sort({ winRate: -1, totalGamesWon: -1, avgAccuracy: -1 })
      .limit(50)
      .populate({ path: 'userId', select: 'username' })
      .lean();

    return {
      leaderboard: leaderboard.map((entry) => ({
        userId:
          typeof entry.userId === 'object' && entry.userId !== null && '_id' in entry.userId
            ? String((entry.userId as { _id: unknown })._id)
            : String(entry.userId),
        username:
          typeof entry.userId === 'object' && entry.userId !== null && 'username' in entry.userId
            ? String((entry.userId as { username: unknown }).username)
            : 'Unknown',
        totalGamesPlayed: entry.totalGamesPlayed,
        totalGamesWon: entry.totalGamesWon,
        totalCorrectAnswers: entry.totalCorrectAnswers,
        totalAnswered: entry.totalAnswered,
        winRate: entry.winRate,
        avgAccuracy: entry.avgAccuracy,
      })),
    };
  });
};

export default gameRoutes;
