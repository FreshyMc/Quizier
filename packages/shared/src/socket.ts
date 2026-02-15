export interface ClientToServerEvents {
  'game:join': (payload: { roomCode: string }) => void;
  'game:leave': (payload: { roomCode: string }) => void;
  'game:answer': (payload: { roomCode: string; option: number }) => void;
  'game:startRound': (payload: { roomCode: string }) => void;
  'game:selectCategory': (payload: { roomCode: string; categoryId: string }) => void;
}

export interface ServerToClientEvents {
  'game:stateUpdate': (payload: unknown) => void;
  'game:turnStart': (payload: unknown) => void;
  'game:turnResult': (payload: unknown) => void;
  'game:roundEnd': (payload: unknown) => void;
  'game:finished': (payload: unknown) => void;
  'game:playerJoined': (payload: unknown) => void;
  'game:playerLeft': (payload: unknown) => void;
  'game:timerTick': (payload: { secondsLeft: number }) => void;
  'notification:new': (payload: unknown) => void;
}
