import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type PropsWithChildren,
} from 'react';
import { GameStatus } from '@shared/enums';
import type { GameSessionDto } from '../types/app';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { useAuth } from './AuthContext';

type GameQuestion = {
  id: string;
  text: string;
  options: string[];
  categoryId: string;
  difficulty: string;
};

type GameState = {
  gameSession: GameSessionDto | null;
  currentQuestion: GameQuestion | null;
  timer: number;
  myTurn: boolean;
  scores: Record<string, number>;
  status: string;
};

type Action =
  | { type: 'SET_GAME_STATE'; payload: GameSessionDto }
  | { type: 'TURN_START'; payload: { question: GameQuestion; isMyTurn: boolean } }
  | {
      type: 'TURN_RESULT';
      payload: { scores: Array<{ userId: string; score: number }> };
    }
  | { type: 'ROUND_END'; payload: { scores: Array<{ userId: string; score: number }> } }
  | {
      type: 'GAME_FINISHED';
      payload: { winnerId: string | null; scores: Array<{ userId: string; score: number }> };
    }
  | { type: 'TIMER_TICK'; payload: { secondsLeft: number } }
  | { type: 'PLAYER_JOINED'; payload: { userId: string; username: string } }
  | { type: 'PLAYER_LEFT'; payload: { userId: string } }
  | { type: 'RESET' };

const initialState: GameState = {
  gameSession: null,
  currentQuestion: null,
  timer: 0,
  myTurn: false,
  scores: {},
  status: 'WAITING',
};

function scoresToMap(scores: Array<{ userId: string; score: number }>) {
  return Object.fromEntries(scores.map((item) => [item.userId, item.score]));
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SET_GAME_STATE':
      return {
        ...state,
        gameSession: action.payload,
        status: action.payload.status,
        scores: scoresToMap(
          action.payload.players.map((p) => ({ userId: p.userId, score: p.score })),
        ),
      };
    case 'TURN_START':
      return {
        ...state,
        currentQuestion: action.payload.question,
        myTurn: action.payload.isMyTurn,
      };
    case 'TURN_RESULT':
      return {
        ...state,
        myTurn: false,
        scores: scoresToMap(action.payload.scores),
      };
    case 'ROUND_END':
      return {
        ...state,
        scores: scoresToMap(action.payload.scores),
      };
    case 'GAME_FINISHED':
      const finalScores = scoresToMap(action.payload.scores);
      return {
        ...state,
        gameSession: state.gameSession
          ? {
              ...state.gameSession,
              status: GameStatus.FINISHED,
              winnerId: action.payload.winnerId,
              players: state.gameSession.players.map((player) => ({
                ...player,
                score: finalScores[player.userId] ?? player.score,
              })),
            }
          : state.gameSession,
        currentQuestion: null,
        myTurn: false,
        timer: 0,
        status: 'FINISHED',
        scores: finalScores,
      };
    case 'TIMER_TICK':
      return {
        ...state,
        timer: action.payload.secondsLeft,
      };
    case 'PLAYER_JOINED':
    case 'PLAYER_LEFT':
      return state;
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

type GameContextValue = {
  state: GameState;
  dispatch: Dispatch<Action>;
};

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { user } = useAuth();

  useSocketEvent('game:stateUpdate', (payload) => {
    dispatch({ type: 'SET_GAME_STATE', payload: payload as GameSessionDto });
  });

  useSocketEvent('game:turnStart', (payload) => {
    dispatch({
      type: 'TURN_START',
      payload: {
        question: payload.question,
        isMyTurn: payload.turnPlayerId === user?.id,
      },
    });
  });

  useSocketEvent('game:turnResult', (payload) => {
    dispatch({ type: 'TURN_RESULT', payload: { scores: payload.scores } });
  });

  useSocketEvent('game:roundEnd', (payload) => {
    dispatch({ type: 'ROUND_END', payload: { scores: payload.scores } });
  });

  useSocketEvent('game:finished', (payload) => {
    dispatch({
      type: 'GAME_FINISHED',
      payload: { winnerId: payload.winnerId, scores: payload.scores },
    });
  });

  useSocketEvent('game:timerTick', (payload) => {
    dispatch({ type: 'TIMER_TICK', payload });
  });

  useSocketEvent('game:playerJoined', (payload) => {
    if (payload.player.userId !== user?.id) {
      dispatch({ type: 'PLAYER_JOINED', payload: payload.player });
    }
  });

  useSocketEvent('game:playerLeft', (payload) => {
    dispatch({ type: 'PLAYER_LEFT', payload: { userId: payload.userId } });
  });

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
}
