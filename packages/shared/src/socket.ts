export interface ClientToServerEvents {
  'game:create': (payload: {
    maxPlayers?: number;
    roundsPerPlayer: number;
    timePerTurn?: number;
    categories: string[];
  }) => void;
  'game:join': (payload: { roomCode: string }) => void;
  'game:leave': (payload: { roomCode: string }) => void;
  'game:start': (payload: { roomCode: string }) => void;
  'game:answer': (payload: { roomCode: string; option: number }) => void;
  'game:startRound': (payload: { roomCode: string }) => void;
  'game:selectCategory': (payload: { roomCode: string; categoryId: string }) => void;
}

export interface ServerToClientEvents {
  'game:stateUpdate': (payload: {
    roomCode: string;
    status: string;
    hostId: string;
    players: Array<{ userId: string; username: string; score: number; isConnected: boolean }>;
    currentRound: number;
    currentTurnPlayerIndex: number;
    winnerId?: string | null;
  }) => void;
  'game:turnStart': (payload: {
    roomCode: string;
    roundNumber: number;
    turnPlayerId: string;
    turnPlayerUsername: string;
    question: {
      id: string;
      text: string;
      options: string[];
      categoryId: string;
      difficulty: string;
    };
    secondsLeft: number;
  }) => void;
  'game:turnResult': (payload: {
    roomCode: string;
    roundNumber: number;
    playerId: string;
    selectedOption: number | null;
    correctIndex: number;
    isCorrect: boolean;
    timeSpent: number;
    timedOut: boolean;
    scores: Array<{ userId: string; score: number }>;
  }) => void;
  'game:roundEnd': (payload: {
    roomCode: string;
    roundNumber: number;
    scores: Array<{ userId: string; score: number }>;
  }) => void;
  'game:finished': (payload: {
    roomCode: string;
    winnerId: string | null;
    scores: Array<{ userId: string; score: number }>;
  }) => void;
  'game:playerJoined': (payload: {
    roomCode: string;
    player: { userId: string; username: string };
  }) => void;
  'game:playerLeft': (payload: { roomCode: string; userId: string }) => void;
  'game:timerTick': (payload: { secondsLeft: number }) => void;
  'notification:new': (payload: unknown) => void;
}
