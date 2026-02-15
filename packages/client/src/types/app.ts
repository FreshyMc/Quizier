import type { GameStatus, UserRole } from '@shared/enums';

export type User = {
  id: string;
  email: string;
  username: string;
  role: UserRole;
};

export type NotificationItem = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: unknown;
  isRead: boolean;
  readAt: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type GamePlayer = {
  userId: string;
  username: string;
  score: number;
  isConnected: boolean;
};

export type GameSessionDto = {
  roomCode: string;
  hostId: string;
  status: GameStatus;
  players: GamePlayer[];
  settings: {
    maxPlayers: number;
    roundsPerPlayer: number;
    timePerTurn: number;
    categories: string[];
  };
  currentRound: number;
  currentTurnPlayerIndex: number;
  winnerId: string | null;
};
