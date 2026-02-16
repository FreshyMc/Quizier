import type { FastifyInstance } from 'fastify';
import { GameStatus, type ClientToServerEvents, type ServerToClientEvents } from '@quizier/shared';
import { Types } from 'mongoose';
import type { Server as SocketIOServer, Socket } from 'socket.io';

import { GameSessionModel } from '../../models/game-session.model.js';
import { PlayerStatsModel } from '../../models/player-stats.model.js';
import { QuestionModel } from '../../models/question.model.js';
import { UserModel } from '../../models/user.model.js';
import { createHttpError, normalizeHttpError } from '../../utils/error.js';

type TypedIo = SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

type ActiveTurn = {
  roomCode: string;
  startedAt: number;
  intervalId?: NodeJS.Timeout;
  timeoutId?: NodeJS.Timeout;
};

const activeRounds = new Map<string, ActiveTurn>();
const disconnectGraceTimers = new Map<string, NodeJS.Timeout>();

const disconnectKey = (roomCode: string, userId: string) => `${roomCode}:${userId}`;

const logSocketError = (
  fastify: FastifyInstance,
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>,
) => {
  const normalized = normalizeHttpError(error);
  const logger = normalized.statusCode >= 500 ? fastify.log.error : fastify.log.warn;
  logger.call(fastify.log, {
    err: normalized.error,
    context,
    statusCode: normalized.statusCode,
    ...metadata,
  });
};

const runSocketTask = (
  fastify: FastifyInstance,
  context: string,
  task: () => Promise<void>,
  metadata?: Record<string, unknown>,
) => {
  void task().catch((error) => {
    logSocketError(fastify, context, error, metadata);
  });
};

const toStatePayload = (session: {
  roomCode: string;
  status: string;
  hostId: Types.ObjectId;
  players: Array<{ userId: Types.ObjectId; username: string; score: number; isConnected: boolean }>;
  currentRound: number;
  winnerId?: Types.ObjectId | null;
}) => ({
  roomCode: session.roomCode,
  status: session.status,
  hostId: session.hostId.toString(),
  players: session.players.map((player) => ({
    userId: player.userId.toString(),
    username: player.username,
    score: player.score,
    isConnected: player.isConnected,
  })),
  currentRound: session.currentRound,
  winnerId: session.winnerId?.toString() ?? null,
});

const emitStateUpdate = (
  io: TypedIo,
  session: {
    roomCode: string;
    status: string;
    hostId: Types.ObjectId;
    players: Array<{
      userId: Types.ObjectId;
      username: string;
      score: number;
      isConnected: boolean;
    }>;
    currentRound: number;
    winnerId?: Types.ObjectId | null;
  },
) => {
  io.to(session.roomCode).emit('game:stateUpdate', toStatePayload(session));
};

const emitRoundEnd = (
  io: TypedIo,
  session: {
    roomCode: string;
    currentRound: number;
    players: Array<{ userId: Types.ObjectId; score: number }>;
  },
) => {
  io.to(session.roomCode).emit('game:roundEnd', {
    roomCode: session.roomCode,
    roundNumber: session.currentRound + 1,
    scores: session.players.map((player) => ({
      userId: player.userId.toString(),
      score: player.score,
    })),
  });
};

const clearRoundTimer = (roomCode: string) => {
  const round = activeRounds.get(roomCode);
  if (!round) {
    return;
  }

  if (round.intervalId) {
    clearInterval(round.intervalId);
  }

  if (round.timeoutId) {
    clearTimeout(round.timeoutId);
  }

  activeRounds.delete(roomCode);
};

const ensureRoomCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    let code = '';
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    const exists = await GameSessionModel.exists({ roomCode: code });
    if (!exists) {
      return code;
    }
  }

  throw createHttpError(500, 'Failed to generate room code');
};

const buildRounds = async (session: {
  settings: { categories: Types.ObjectId[]; roundsPerPlayer: number };
  players: Array<{ userId: Types.ObjectId }>;
}) => {
  const categoryIds = session.settings.categories.map((categoryId) => categoryId.toString());

  const questions = await QuestionModel.find({
    isActive: true,
    categoryId: { $in: categoryIds },
  })
    .select('_id categoryId')
    .lean();

  if (!questions.length) {
    throw createHttpError(400, 'No active questions available for selected categories');
  }

  const byCategory = new Map<string, Array<{ _id: Types.ObjectId; categoryId: Types.ObjectId }>>();
  for (const question of questions) {
    const categoryKey = question.categoryId.toString();
    const bucket = byCategory.get(categoryKey) ?? [];
    bucket.push(question as { _id: Types.ObjectId; categoryId: Types.ObjectId });
    byCategory.set(categoryKey, bucket);
  }

  const fallbackPool = [...questions] as Array<{ _id: Types.ObjectId; categoryId: Types.ObjectId }>;
  let fallbackIndex = 0;
  const categoryCursor = new Map<string, number>();

  const rounds: Array<{
    roundNumber: number;
    categoryId: Types.ObjectId;
    questions: Array<{
      questionId: Types.ObjectId;
      answeredBy: null;
      selectedOption: null;
      isCorrect: false;
      timeSpent: 0;
    }>;
  }> = [];

  for (let roundNumber = 1; roundNumber <= session.settings.roundsPerPlayer; roundNumber += 1) {
    const categoryId =
      session.settings.categories[(roundNumber - 1) % session.settings.categories.length];
    const categoryKey = categoryId.toString();
    const categoryQuestions = byCategory.get(categoryKey) ?? [];

    let question: { _id: Types.ObjectId; categoryId: Types.ObjectId } | undefined;

    if (categoryQuestions.length > 0) {
      const cursor = categoryCursor.get(categoryKey) ?? 0;
      question = categoryQuestions[cursor % categoryQuestions.length];
      categoryCursor.set(categoryKey, cursor + 1);
    }

    if (!question) {
      question = fallbackPool[fallbackIndex % fallbackPool.length];
      fallbackIndex += 1;
    }

    const roundQuestions = session.players.map(() => ({
      questionId: question!._id,
      answeredBy: null,
      selectedOption: null,
      isCorrect: false as const,
      timeSpent: 0 as const,
    }));

    rounds.push({
      roundNumber,
      categoryId,
      questions: roundQuestions,
    });
  }

  return rounds;
};

const updateFinalStats = async (session: {
  winnerId?: Types.ObjectId | null;
  players: Array<{ userId: Types.ObjectId; score: number }>;
  rounds: Array<{
    categoryId: Types.ObjectId;
    questions: Array<{
      answeredBy?: Types.ObjectId | null;
      isCorrect: boolean;
    }>;
  }>;
}) => {
  for (let playerIndex = 0; playerIndex < session.players.length; playerIndex += 1) {
    const player = session.players[playerIndex];

    let answeredCount = 0;
    let correctCount = 0;
    const categoryMap = new Map<
      string,
      { categoryId: Types.ObjectId; totalAnswered: number; totalCorrect: number }
    >();

    for (const round of session.rounds) {
      const questionEntry = round.questions[playerIndex];
      if (!questionEntry || !questionEntry.answeredBy) {
        continue;
      }

      answeredCount += 1;
      if (questionEntry.isCorrect) {
        correctCount += 1;
      }

      const key = round.categoryId.toString();
      const stat = categoryMap.get(key) ?? {
        categoryId: round.categoryId,
        totalAnswered: 0,
        totalCorrect: 0,
      };
      stat.totalAnswered += 1;
      stat.totalCorrect += questionEntry.isCorrect ? 1 : 0;
      categoryMap.set(key, stat);
    }

    await UserModel.updateOne(
      { _id: player.userId },
      {
        $inc: {
          'stats.gamesPlayed': 1,
          'stats.gamesWon': session.winnerId?.toString() === player.userId.toString() ? 1 : 0,
          'stats.totalAnswered': answeredCount,
          'stats.totalCorrect': correctCount,
        },
      },
    );

    const statsDoc = await PlayerStatsModel.findOneAndUpdate(
      { userId: player.userId },
      {
        $inc: {
          totalGamesPlayed: 1,
          totalGamesWon: session.winnerId?.toString() === player.userId.toString() ? 1 : 0,
          totalAnswered: answeredCount,
          totalCorrectAnswers: correctCount,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    if (!statsDoc) {
      continue;
    }

    const categoryStats =
      (statsDoc.categoryStats as Array<{
        categoryId: Types.ObjectId;
        totalAnswered: number;
        totalCorrect: number;
        accuracy: number;
      }>) ?? [];

    for (const stat of categoryMap.values()) {
      const existing = categoryStats.find(
        (item) => item.categoryId.toString() === stat.categoryId.toString(),
      );

      if (existing) {
        existing.totalAnswered += stat.totalAnswered;
        existing.totalCorrect += stat.totalCorrect;
        existing.accuracy =
          existing.totalAnswered > 0 ? (existing.totalCorrect / existing.totalAnswered) * 100 : 0;
      } else {
        categoryStats.push({
          categoryId: stat.categoryId,
          totalAnswered: stat.totalAnswered,
          totalCorrect: stat.totalCorrect,
          accuracy: stat.totalAnswered > 0 ? (stat.totalCorrect / stat.totalAnswered) * 100 : 0,
        });
      }
    }

    statsDoc.set('categoryStats', categoryStats as unknown as object[]);
    statsDoc.winRate =
      statsDoc.totalGamesPlayed > 0
        ? (statsDoc.totalGamesWon / statsDoc.totalGamesPlayed) * 100
        : 0;
    statsDoc.avgAccuracy =
      statsDoc.totalAnswered > 0
        ? (statsDoc.totalCorrectAnswers / statsDoc.totalAnswered) * 100
        : 0;

    await statsDoc.save();
  }
};

const finishGame = async (fastify: FastifyInstance, roomCode: string) => {
  clearRoundTimer(roomCode);

  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    return;
  }

  const session = await GameSessionModel.findOne({ roomCode });
  if (!session || session.status === GameStatus.FINISHED) {
    return;
  }

  let winnerId: Types.ObjectId | null = null;
  let highestScore = -1;

  for (const player of session.players) {
    if (player.score > highestScore) {
      highestScore = player.score;
      winnerId = player.userId;
    }
  }

  session.status = GameStatus.FINISHED;
  session.winnerId = winnerId;
  session.set('finishedAt', new Date());
  await session.save();

  await updateFinalStats(session.toObject());

  io.to(roomCode).emit('game:finished', {
    roomCode,
    winnerId: winnerId?.toString() ?? null,
    scores: session.players.map((player) => ({
      userId: player.userId.toString(),
      score: player.score,
    })),
  });

  emitStateUpdate(io, session.toObject());
};

const endRound = async (
  fastify: FastifyInstance,
  roomCode: string,
  reason: 'timeout' | 'allAnswered',
): Promise<void> => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    return;
  }

  const roundState = activeRounds.get(roomCode);
  if (!roundState) {
    return;
  }

  clearRoundTimer(roomCode);

  const session = await GameSessionModel.findOne({ roomCode });
  if (!session || session.status !== GameStatus.IN_PROGRESS) {
    return;
  }

  const roundIndex = session.currentRound;
  const round = session.rounds[roundIndex];
  const roundQuestion = round?.questions[0];

  if (!round || !roundQuestion) {
    await finishGame(fastify, roomCode);
    return;
  }

  const question = await QuestionModel.findById(roundQuestion.questionId)
    .select('_id correctIndex')
    .lean();

  if (!question) {
    await finishGame(fastify, roomCode);
    return;
  }

  const answers = session.players.map((player, playerIndex) => {
    const entry = round.questions[playerIndex];

    const timedOut = !entry?.answeredBy;
    if (!entry) {
      return {
        userId: player.userId.toString(),
        selectedOption: null,
        isCorrect: false,
        timeSpent: session.settings.timePerTurn,
        timedOut: true,
      };
    }

    if (timedOut) {
      entry.selectedOption = null;
      entry.isCorrect = false;
      entry.timeSpent = session.settings.timePerTurn;
    }

    return {
      userId: player.userId.toString(),
      selectedOption: timedOut ? null : (entry.selectedOption as number | null),
      isCorrect: entry.isCorrect,
      timeSpent: entry.timeSpent,
      timedOut,
    };
  });

  session.currentRound = roundIndex + 1;
  await session.save();

  io.to(roomCode).emit('game:questionEnd', {
    roomCode,
    roundNumber: roundIndex + 1,
    correctIndex: question.correctIndex,
    answers,
    scores: session.players.map((item) => ({
      userId: item.userId.toString(),
      score: item.score,
    })),
  });

  io.to(roomCode).emit('game:roundEnd', {
    roomCode,
    roundNumber: roundIndex + 1,
    scores: session.players.map((player) => ({
      userId: player.userId.toString(),
      score: player.score,
    })),
  });

  emitStateUpdate(io, session.toObject());

  if (session.currentRound >= session.rounds.length) {
    await finishGame(fastify, roomCode);
    return;
  }

  await startRound(fastify, roomCode);
};

const startRound = async (fastify: FastifyInstance, roomCode: string): Promise<void> => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    return;
  }

  const session = await GameSessionModel.findOne({ roomCode });
  if (!session || session.status !== GameStatus.IN_PROGRESS) {
    return;
  }

  if (session.currentRound >= session.rounds.length) {
    await finishGame(fastify, roomCode);
    return;
  }

  const refreshed = await GameSessionModel.findOne({ roomCode });
  if (!refreshed || refreshed.status !== GameStatus.IN_PROGRESS) {
    return;
  }

  const round = refreshed.rounds[refreshed.currentRound];
  const roundQuestion = round?.questions[0];

  if (!round || !roundQuestion) {
    await finishGame(fastify, roomCode);
    return;
  }

  const question = await QuestionModel.findById(roundQuestion.questionId)
    .select('_id text options categoryId difficulty correctIndex')
    .lean();

  if (!question) {
    await finishGame(fastify, roomCode);
    return;
  }

  const secondsLeft = refreshed.settings.timePerTurn;

  io.to(roomCode).emit('game:questionStart', {
    roomCode,
    roundNumber: refreshed.currentRound + 1,
    question: {
      id: question._id.toString(),
      text: question.text,
      options: question.options,
      categoryId: question.categoryId.toString(),
      difficulty: question.difficulty,
    },
    secondsLeft,
  });

  io.to(roomCode).emit('game:timerTick', { secondsLeft });

  const roundState: ActiveTurn = {
    roomCode,
    startedAt: Date.now(),
  };

  let currentSeconds = secondsLeft;
  roundState.intervalId = setInterval(() => {
    currentSeconds -= 1;
    io.to(roomCode).emit('game:timerTick', { secondsLeft: Math.max(0, currentSeconds) });
  }, 1000);

  roundState.timeoutId = setTimeout(async () => {
    runSocketTask(fastify, 'round-timeout', () => endRound(fastify, roomCode, 'timeout'), {
      roomCode,
    });
  }, secondsLeft * 1000);

  activeRounds.set(roomCode, roundState);
};

const processAnswer = async (
  fastify: FastifyInstance,
  roomCode: string,
  userId: string,
  selectedOption: number | null,
): Promise<void> => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    return;
  }

  const roundState = activeRounds.get(roomCode);
  if (!roundState) {
    return;
  }

  const session = await GameSessionModel.findOne({ roomCode });
  if (!session || session.status !== GameStatus.IN_PROGRESS) {
    return;
  }

  const roundIndex = session.currentRound;
  const round = session.rounds[roundIndex];
  const playerIndex = session.players.findIndex((player) => player.userId.toString() === userId);
  const player = playerIndex >= 0 ? session.players[playerIndex] : null;
  const roundQuestion = playerIndex >= 0 ? round?.questions[playerIndex] : null;

  if (!round || !player || !roundQuestion) {
    await finishGame(fastify, roomCode);
    return;
  }

  if (roundQuestion.answeredBy) {
    return;
  }

  const question = await QuestionModel.findById(roundQuestion.questionId)
    .select('_id correctIndex')
    .lean();

  if (!question) {
    await finishGame(fastify, roomCode);
    return;
  }

  const elapsedSeconds = Math.min(
    session.settings.timePerTurn,
    Math.max(0, Math.round((Date.now() - roundState.startedAt) / 1000)),
  );

  const isCorrect = selectedOption !== null && selectedOption === question.correctIndex;

  roundQuestion.answeredBy = new Types.ObjectId(userId);
  roundQuestion.selectedOption = selectedOption;
  roundQuestion.isCorrect = isCorrect;
  roundQuestion.timeSpent = elapsedSeconds;

  if (isCorrect) {
    player.score += 10;
  }

  await session.save();

  const allAnswered = session.players.every((_, index) =>
    Boolean(round.questions[index]?.answeredBy),
  );
  if (allAnswered) {
    await endRound(fastify, roomCode, 'allAnswered');
  }
};

const startGame = async (fastify: FastifyInstance, roomCode: string, hostId: string) => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    throw createHttpError(500, 'Game socket is not initialized');
  }

  const session = await GameSessionModel.findOne({ roomCode });
  if (!session) {
    throw createHttpError(404, 'Game session not found');
  }

  if (session.hostId.toString() !== hostId) {
    throw createHttpError(403, 'Only host can start the game');
  }

  if (session.status !== GameStatus.WAITING) {
    throw createHttpError(409, 'Game has already started');
  }

  if (session.players.length < 2) {
    throw createHttpError(400, 'At least 2 players are required to start');
  }

  const rounds = await buildRounds(session.toObject());
  session.set('rounds', rounds as unknown as object[]);
  session.status = GameStatus.IN_PROGRESS;
  session.currentRound = 0;
  await session.save();

  emitStateUpdate(io, session.toObject());
  await startRound(fastify, roomCode);
};

const joinGameRoom = async (
  fastify: FastifyInstance,
  socket: TypedSocket,
  roomCodeInput: string,
) => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    return;
  }

  const roomCode = roomCodeInput.trim().toUpperCase();
  const session = await GameSessionModel.findOne({ roomCode });
  if (!session) {
    socket.emit('game:stateUpdate', {
      roomCode,
      status: 'NOT_FOUND',
      hostId: '',
      players: [],
      currentRound: 0,
      winnerId: null,
    });
    return;
  }

  const userId = String(socket.data.userId ?? '');
  const username = String(socket.data.username ?? 'Player');
  if (!userId) {
    return;
  }

  const existingPlayer = session.players.find((player) => player.userId.toString() === userId);

  if (!existingPlayer) {
    if (session.players.length >= session.settings.maxPlayers) {
      throw createHttpError(400, 'Game room is full');
    }

    session.players.push({
      userId: new Types.ObjectId(userId),
      username,
      score: 0,
      isConnected: true,
    });

    await session.save();
    io.to(roomCode).emit('game:playerJoined', {
      roomCode,
      player: { userId, username },
    });
  } else {
    existingPlayer.isConnected = true;
    await session.save();
  }

  const graceKey = disconnectKey(roomCode, userId);
  const timer = disconnectGraceTimers.get(graceKey);
  if (timer) {
    clearTimeout(timer);
    disconnectGraceTimers.delete(graceKey);
  }

  socket.join(roomCode);
  emitStateUpdate(io, session.toObject());
};

const leaveGameRoom = async (fastify: FastifyInstance, roomCodeInput: string, userId: string) => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    return;
  }

  const roomCode = roomCodeInput.trim().toUpperCase();
  const session = await GameSessionModel.findOne({ roomCode });
  if (!session) {
    return;
  }

  const playerIndex = session.players.findIndex((player) => player.userId.toString() === userId);
  if (playerIndex === -1) {
    return;
  }

  const isHostLeaving = session.hostId.toString() === userId;

  session.players.splice(playerIndex, 1);

  if (!session.players.length) {
    await GameSessionModel.deleteOne({ _id: session._id });
    clearRoundTimer(roomCode);
    io.to(roomCode).emit('game:playerLeft', { roomCode, userId });
    return;
  }

  if (isHostLeaving) {
    session.hostId = session.players[0].userId;
  }

  await session.save();

  io.to(roomCode).emit('game:playerLeft', { roomCode, userId });
  emitStateUpdate(io, session.toObject());
};

const markDisconnected = async (fastify: FastifyInstance, userId: string) => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    return;
  }

  const sessions = await GameSessionModel.find({
    status: { $in: [GameStatus.WAITING, GameStatus.IN_PROGRESS] },
    'players.userId': userId,
  });

  for (const session of sessions) {
    const player = session.players.find((item) => item.userId.toString() === userId);
    if (!player) {
      continue;
    }

    player.isConnected = false;
    await session.save();
    emitStateUpdate(io, session.toObject());

    const key = disconnectKey(session.roomCode, userId);
    const existing = disconnectGraceTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }

    disconnectGraceTimers.set(
      key,
      setTimeout(async () => {
        runSocketTask(
          fastify,
          'disconnect-grace-timeout',
          async () => {
            disconnectGraceTimers.delete(key);

            const staleSession = await GameSessionModel.findOne({ roomCode: session.roomCode });
            if (!staleSession || staleSession.status !== GameStatus.IN_PROGRESS) {
              return;
            }

            const stalePlayer = staleSession.players.find(
              (item) => item.userId.toString() === userId,
            );
            if (!stalePlayer || stalePlayer.isConnected) {
              return;
            }

            // In simultaneous mode, disconnected players will simply time out with the round.
          },
          { roomCode: session.roomCode, userId },
        );
      }, 60000),
    );
  }
};

export const setupGameSocket = (fastify: FastifyInstance) => {
  const io = fastify.io as TypedIo | undefined;
  if (!io) {
    throw new Error('Socket server must be initialized before game socket setup');
  }

  io.on('connection', (socket: TypedSocket) => {
    runSocketTask(
      fastify,
      'connection-init',
      async () => {
        const userId = String(socket.data.userId ?? '');
        if (!userId) {
          return;
        }

        const user = await UserModel.findById(userId).select('username').lean();
        socket.data.username = user?.username ?? 'Player';

        const sessions = await GameSessionModel.find({
          status: { $in: [GameStatus.WAITING, GameStatus.IN_PROGRESS] },
          'players.userId': userId,
        });

        for (const session of sessions) {
          socket.join(session.roomCode);
          const player = session.players.find((item) => item.userId.toString() === userId);
          if (player) {
            player.isConnected = true;
          }
          await session.save();
          emitStateUpdate(io, session.toObject());

          const key = disconnectKey(session.roomCode, userId);
          const timer = disconnectGraceTimers.get(key);
          if (timer) {
            clearTimeout(timer);
            disconnectGraceTimers.delete(key);
          }
        }

        socket.on('game:join', ({ roomCode }) => {
          runSocketTask(fastify, 'game:join', () => joinGameRoom(fastify, socket, roomCode), {
            roomCode,
            userId,
          });
        });

        socket.on('game:leave', ({ roomCode }) => {
          runSocketTask(
            fastify,
            'game:leave',
            async () => {
              await leaveGameRoom(fastify, roomCode, userId);
              socket.leave(roomCode);
            },
            { roomCode, userId },
          );
        });

        socket.on('game:start', ({ roomCode }) => {
          runSocketTask(
            fastify,
            'game:start',
            () => startGame(fastify, roomCode.trim().toUpperCase(), userId),
            { roomCode, userId },
          );
        });

        socket.on('game:startRound', ({ roomCode }) => {
          runSocketTask(
            fastify,
            'game:startRound',
            () => startGame(fastify, roomCode.trim().toUpperCase(), userId),
            { roomCode, userId },
          );
        });

        socket.on('game:answer', ({ roomCode, option }) => {
          runSocketTask(
            fastify,
            'game:answer',
            () => processAnswer(fastify, roomCode.trim().toUpperCase(), userId, option),
            { roomCode, userId },
          );
        });

        socket.on('disconnect', () => {
          runSocketTask(fastify, 'socket-disconnect', () => markDisconnected(fastify, userId), {
            userId,
          });
        });
      },
      { socketId: socket.id },
    );
  });

  fastify.addHook('onClose', async () => {
    for (const round of activeRounds.values()) {
      if (round.intervalId) {
        clearInterval(round.intervalId);
      }
      if (round.timeoutId) {
        clearTimeout(round.timeoutId);
      }
    }
    activeRounds.clear();

    for (const timer of disconnectGraceTimers.values()) {
      clearTimeout(timer);
    }
    disconnectGraceTimers.clear();
  });
};

export const createGameSession = async (input: {
  hostId: string;
  hostUsername: string;
  maxPlayers: number;
  roundsPerPlayer: number;
  timePerTurn: number;
  categories: string[];
}) => {
  const roomCode = await ensureRoomCode();

  const gameSession = await GameSessionModel.create({
    roomCode,
    hostId: input.hostId,
    players: [
      {
        userId: input.hostId,
        username: input.hostUsername,
        score: 0,
        isConnected: true,
      },
    ],
    status: GameStatus.WAITING,
    settings: {
      maxPlayers: input.maxPlayers,
      roundsPerPlayer: input.roundsPerPlayer,
      timePerTurn: input.timePerTurn,
      categories: input.categories,
    },
    rounds: [],
    currentRound: 0,
    winnerId: null,
  });

  return gameSession;
};

export const startGameFromRest = async (
  fastify: FastifyInstance,
  roomCode: string,
  hostId: string,
) => {
  await startGame(fastify, roomCode, hostId);
};
