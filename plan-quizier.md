## Plan: Real-Time Turn-Based Quiz Game (Quizier)

Build a turn-based multiplayer quiz game with real-time gameplay via Socket.IO. Players join game rooms, take turns answering category-based questions under timed pressure, with server-authoritative game logic. The app includes user-generated questions with admin moderation, customizable categories with soft-delete, and persistent notifications. React Context + `useReducer` handles all client state — no external state management libraries.

**Stack:** Fastify + TypeScript + Socket.IO + MongoDB (server) · React 19 + TypeScript + Vite + Tailwind CSS (client) · Nx monorepo · Zod shared validation

---

### Steps

#### Phase 0 — Project Scaffold

**0.1 — Create Nx monorepo**

- Initialize Nx workspace at the project root. Create three packages:
  - `packages/server` — Fastify back-end
  - `packages/client` — React front-end
  - `packages/shared` — Shared TypeScript types, Zod schemas, socket event contracts, enums
- Move and convert the existing `index.js` and `db/db-connector.js` into `packages/server/src/` as `.ts` files, preserving the Fastify plugin pattern already in use
- Delete the old root-level `index.js`, `routes/`, `db/` once migrated

**0.2 — Configure TypeScript**

- Root `tsconfig.base.json` with `strict: true`, path aliases (`@shared/*`, `@server/*`, `@client/*`)
- Per-package `tsconfig.json` extending base
- Server: target `ES2022`, module `NodeNext`
- Client: target `ES2022`, module `ESNext`, JSX `react-jsx`
- Shared: declaration files enabled for cross-package consumption

**0.3 — Configure tooling**

- Add `tsx` for server dev (fast TS execution, no build step during dev)
- Add `vitest` for testing across all packages
- Add `eslint` + `prettier` with consistent config
- Add `docker-compose.yml` at root with a MongoDB 7 container (port 27017, volume-mounted data)
- Add `.env.example` with: `MONGODB_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PORT`, `CLIENT_URL`

**0.4 — Install core dependencies**

- Server: `fastify`, `@fastify/jwt`, `@fastify/cookie`, `@fastify/cors`, `@fastify/websocket`, `socket.io`, `mongoose`, `argon2`, `zod`
- Client: `react`, `react-dom`, `react-router`, `@tanstack/react-query`, `socket.io-client`, `tailwindcss`, `@tailwindcss/vite`
- Shared: `zod` (peer dependency)

---

#### Phase 1 — Shared Package (`packages/shared`)

**1.1 — Define enums**

- `UserRole`: `PLAYER`, `ADMIN`
- `Difficulty`: `EASY`, `MEDIUM`, `HARD`
- `SubmissionStatus`: `PENDING`, `APPROVED`, `REJECTED`
- `GameStatus`: `WAITING`, `IN_PROGRESS`, `FINISHED`
- `NotificationType`: `SUBMISSION_APPROVED`, `SUBMISSION_REJECTED`, `GAME_INVITE`, `SYSTEM`

**1.2 — Define Zod schemas & inferred types**

- Auth: `loginSchema`, `registerSchema`, `tokenPayloadSchema`
- Category: `createCategorySchema`, `updateCategorySchema`
- Question: `createQuestionSchema`, `submitQuestionSchema`
- Game: `createGameSchema`, `joinGameSchema`, `answerSchema`
- Notification: `notificationSchema`
- All schemas export inferred TypeScript types (`z.infer<typeof schema>`)

**1.3 — Define Socket.IO event contracts**

- Typed interfaces for client-to-server and server-to-client events:
  - `ClientToServerEvents`: `game:join`, `game:leave`, `game:answer`, `game:startRound`, `game:selectCategory`
  - `ServerToClientEvents`: `game:stateUpdate`, `game:turnStart`, `game:turnResult`, `game:roundEnd`, `game:finished`, `game:playerJoined`, `game:playerLeft`, `game:timerTick`, `notification:new`

---

#### Phase 2 — Database Models (`packages/server/src/models/`)

**2.1 — `User` model**

- Fields: `email` (unique), `username` (unique), `passwordHash`, `role` (enum, default `PLAYER`), `oauthProviders[]` (future), `stats` (embedded: `gamesPlayed`, `gamesWon`, `totalCorrect`, `totalAnswered`), timestamps
- Indexes: unique on `email`, unique on `username`

**2.2 — `Category` model**

- Fields: `name`, `slug` (unique, auto-generated from name), `description`, `isActive` (default `true`), `deletedAt` (null when active), `createdBy` (ref User), timestamps
- Indexes: unique on `slug`

**2.3 — `Question` model**

- Fields: `text`, `options[]` (array of strings, exactly 4), `correctIndex` (0-3), `categoryId` (ref Category), `difficulty` (enum), `submittedBy` (ref User), `isActive` (default `false` — requires approval), timestamps
- Indexes: compound on `{ categoryId, difficulty, isActive }`

**2.4 — `QuestionSubmission` model**

- Fields: `questionId` (ref Question), `submittedBy` (ref User), `status` (enum, default `PENDING`), `moderationHistory[]` (embedded: `action`, `moderatorId`, `reason`, `timestamp`), `version` (number), timestamps

**2.5 — `Notification` model**

- Fields: `userId` (ref User), `type` (enum), `title`, `message`, `data` (mixed — for links/references), `isRead` (default `false`), `readAt`, timestamps
- Indexes: `{ userId: 1, createdAt: -1 }` for list query; TTL index `{ readAt: 1 }` with `expireAfterSeconds: 7776000` (90 days after read)

**2.6 — `GameSession` model**

- Fields: `roomCode` (unique, 6-char alphanumeric), `hostId` (ref User), `players[]` (embedded: `userId`, `username`, `score`, `isConnected`), `status` (enum), `settings` (embedded: `maxPlayers` default 4, `roundsPerPlayer`, `timePerTurn` default 30s, `categories[]`), `rounds[]` (embedded: `roundNumber`, `categoryId`, `questions[]` with per-question `questionId`, `answeredBy`, `selectedOption`, `isCorrect`, `timeSpent`), `currentRound`, `currentTurnPlayerIndex`, `winnerId`, timestamps

**2.7 — `PlayerStats` model** (for leaderboard)

- Fields: `userId` (ref User, unique), `totalGamesPlayed`, `totalGamesWon`, `totalCorrectAnswers`, `totalAnswered`, `winRate`, `avgAccuracy`, `categoryStats[]` (per-category accuracy), timestamps

---

#### Phase 3 — Authentication (`packages/server/src/modules/auth/`)

**3.1 — Auth service**

- `register(email, username, password)` — hash with Argon2id, create User, return tokens
- `login(email, password)` — verify hash, generate access token (15min) + refresh token (7d) as httpOnly cookies
- `refresh(refreshToken)` — verify and rotate refresh token
- `logout()` — clear cookies

**3.2 — Auth routes** (`POST /api/auth/register`, `/login`, `/refresh`, `/logout`)

- Validate request body against shared Zod schemas using Fastify's `preValidation` hook or a shared validation plugin
- Set tokens as httpOnly, secure, sameSite cookies

**3.3 — Auth middleware**

- `authenticate` — decode JWT from cookie, attach `request.user` (`{ id, role }`)
- `authorize(roles[])` — check `request.user.role` against allowed roles

**3.4 — Admin seed script** (`packages/server/scripts/seed-admin.ts`)

- Reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from env
- Upserts a User with role `ADMIN`
- Run via `nx run server:seed`

---

#### Phase 4 — Category Management (`packages/server/src/modules/category/`)

**4.1 — Admin CRUD routes**

- `POST /api/admin/categories` — create category (auto-generate slug)
- `GET /api/admin/categories` — list all active categories
- `GET /api/admin/categories/archived` — list soft-deleted categories
- `PUT /api/admin/categories/:id` — update name/description
- `DELETE /api/admin/categories/:id` — soft-delete (set `isActive: false`, `deletedAt: new Date()`)
- `PATCH /api/admin/categories/:id/restore` — restore (set `isActive: true`, clear `deletedAt`)

**4.2 — Public route**

- `GET /api/categories` — list active categories only (for players in game setup)

---

#### Phase 5 — Question Submission & Moderation

**5.1 — Player submission routes** (`packages/server/src/modules/question/`)

- `POST /api/questions/submit` — create Question (isActive: false) + QuestionSubmission (status: PENDING)
- `GET /api/questions/my-submissions` — list user's submissions with status

**5.2 — Admin moderation routes**

- `GET /api/admin/questions/pending` — list pending submissions (paginated)
- `PATCH /api/admin/questions/:submissionId/approve` — set Question `isActive: true`, Submission status `APPROVED`, push to moderationHistory, create Notification, emit `notification:new` via Socket.IO
- `PATCH /api/admin/questions/:submissionId/reject` — same flow with `REJECTED` status + reason

---

#### Phase 6 — Notification System

**6.1 — REST endpoints** (`packages/server/src/modules/notification/`)

- `GET /api/notifications` — list user's notifications (paginated, newest first)
- `GET /api/notifications/unread-count` — count of unread
- `PATCH /api/notifications/:id/read` — mark as read (set `isRead: true`, `readAt: new Date()` — starts 90-day TTL)
- `PATCH /api/notifications/read-all` — mark all as read

**6.2 — Real-time delivery**

- On user Socket.IO connection, join a personal room (`user:{userId}`)
- When creating a notification (from moderation, game invite, etc.), emit `notification:new` to that room
- Client receives and prepends to notification list in React Context

---

#### Phase 7 — Real-Time Game Engine (`packages/server/src/modules/game/`)

**7.1 — Game service + Socket.IO integration**

- Register Socket.IO on the Fastify server instance (using `fastify.server` as the HTTP server)
- Use typed events from `packages/shared`
- Authenticate socket connections via the JWT cookie (parse from handshake headers)

**7.2 — Game room lifecycle**

- `game:create` — host creates a GameSession, gets a `roomCode`, joins the Socket.IO room
- `game:join` — player joins by roomCode, added to GameSession.players[], joins Socket.IO room, broadcast `game:playerJoined`
- `game:leave` — remove from players, broadcast `game:playerLeft`; if host leaves, transfer host or end game
- `game:start` — host triggers, only if ≥ 2 players; set status `IN_PROGRESS`, pick questions for all rounds, emit `game:stateUpdate`

**7.3 — Turn manager (server-authoritative)**

- On each turn: emit `game:turnStart` with question (without `correctIndex`!) to all players, start server-side countdown timer (default 30s)
- Emit `game:timerTick` every second to the room
- On `game:answer` from the active player: validate it's their turn, record answer, calculate score, emit `game:turnResult` (with correct answer revealed) to all
- On timeout: record as unanswered, emit `game:turnResult` with timeout flag
- Advance to next player; when all players have answered in a round, emit `game:roundEnd` with scores
- After all rounds: calculate winner, emit `game:finished`, update PlayerStats + User.stats, persist final GameSession

**7.4 — Reconnection handling**

- On socket reconnect, rejoin the Socket.IO room, send full `game:stateUpdate` with current game state
- Track `isConnected` per player; if disconnected > 60s, auto-forfeit their remaining turns

**7.5 — REST endpoints for game**

- `POST /api/games` — create game (returns roomCode)
- `GET /api/games/:roomCode` — get current game state (for page refresh/reconnect)
- `GET /api/games/history` — user's past games
- `GET /api/leaderboard` — top players by winRate (from PlayerStats)

---

#### Phase 8 — React Frontend (`packages/client/`)

**8.1 — Vite + Tailwind setup**

- Scaffold with Vite React-TS template
- Configure Tailwind CSS v4 via `@tailwindcss/vite` plugin
- Configure path aliases to import from `@shared/*`
- Setup TanStack Query provider at app root

**8.2 — React Context architecture** (no external state management)

- Create three context providers, composed at the app root:

  **`AuthContext`** (`src/contexts/AuthContext.tsx`)
  - State (via `useReducer`): `{ user, isAuthenticated, isLoading }`
  - Actions: `login()`, `register()`, `logout()`, `refreshUser()`
  - On mount: call `GET /api/auth/me` to restore session from httpOnly cookie
  - Expose via `useAuth()` custom hook

  **`SocketContext`** (`src/contexts/SocketContext.tsx`)
  - Manages the Socket.IO client instance lifecycle
  - Connect only when authenticated (depends on AuthContext)
  - Auto-disconnect on logout
  - Expose via `useSocket()` custom hook returning the socket instance
  - Handles reconnection logic

  **`GameContext`** (`src/contexts/GameContext.tsx`)
  - State (via `useReducer`): `{ gameSession, currentQuestion, timer, myTurn, scores, status }`
  - Reducer actions: `SET_GAME_STATE`, `TURN_START`, `TURN_RESULT`, `ROUND_END`, `GAME_FINISHED`, `TIMER_TICK`, `PLAYER_JOINED`, `PLAYER_LEFT`, `RESET`
  - Subscribes to Socket.IO game events (via SocketContext) and dispatches to reducer
  - Expose via `useGame()` custom hook
  - Provider wraps only game routes (not the whole app) so state resets on route exit

  **Provider composition** in `App.tsx`:

  ```
  <AuthProvider>
    <SocketProvider>
      <QueryClientProvider>
        <RouterProvider />
      </QueryClientProvider>
    </SocketProvider>
  </AuthProvider>
  ```

  `GameProvider` wraps only the `/game/:roomCode` route layout, not the entire app.

**8.3 — TanStack Query usage** (server state only)

- `useCategories()` — fetch active categories
- `useMySubmissions()` — fetch user's question submissions
- `useNotifications()` — fetch paginated notifications, with `invalidateQueries` on Socket.IO `notification:new`
- `useLeaderboard()` — fetch top players
- `useGameHistory()` — fetch user's past games
- Mutations for login, register, submit question, create game, mark notification read

**8.4 — Route structure** (React Router v7)

- `/` — Landing page
- `/login`, `/register` — Auth pages
- `/dashboard` — Player home (quick play, stats summary)
- `/game/create` — Create game room (select categories, settings)
- `/game/join` — Join by room code
- `/game/:roomCode` — Game room (wrapped in `GameProvider`)
  - Lobby state → show players, waiting for host to start
  - In-progress state → show question, timer, scores
  - Finished state → show results, play again option
- `/questions/submit` — Submit a question
- `/questions/my-submissions` — View submission status
- `/leaderboard` — Global leaderboard
- `/notifications` — Full notification list
- `/admin/categories` — Category management (active + archived tabs)
- `/admin/questions` — Moderation queue
- Protected routes via an `<AuthGuard>` wrapper component checking `useAuth().isAuthenticated`
- Admin routes via an `<AdminGuard>` wrapper additionally checking `user.role === 'ADMIN'`

**8.5 — Key UI components** (custom Tailwind, no component library)

- `Layout` — sidebar/header nav, notification bell with unread badge
- `GameBoard` — question card, options grid, timer bar, score sidebar
- `PlayerList` — avatars, scores, turn indicator
- `TimerBar` — animated countdown bar (CSS transitions, no Framer Motion for v1)
- `QuestionCard` — question text, 4 option buttons with correct/incorrect states
- `NotificationBell` — dropdown with recent notifications, link to full list
- `CategoryManager` — admin table with active/archived tabs, soft-delete/restore actions
- `ModerationQueue` — list of pending submissions with approve/reject actions

**8.6 — Socket.IO client integration pattern**

- `useSocket()` returns the socket instance from SocketContext
- `useSocketEvent(event, handler)` — custom hook that subscribes to a socket event with auto-cleanup on unmount
- GameContext internally uses `useSocketEvent` for all game events
- Notification listener lives in the `SocketProvider` — dispatches to TanStack Query cache invalidation

---

#### Phase 9 — Testing & Polish

**9.1 — Server tests** (Vitest)

- Unit tests for game turn logic, score calculation, auth service
- Integration tests using `fastify.inject()` for auth routes, category CRUD, question submission flow
- Socket.IO integration tests using `socket.io-client` connecting to a test server

**9.2 — Client tests** (Vitest + React Testing Library)

- Unit tests for context reducers (pure functions — easy to test)
- Component tests for GameBoard, QuestionCard, Timer
- Integration tests for auth flow, game flow with mocked socket

**9.3 — End-to-end verification**

- Manual test: register → login → create game → second player joins → play full game → verify scores, stats, leaderboard
- Verify notification flow: submit question → admin approves → player receives real-time notification
- Verify soft-delete: admin deletes category → disappears from game setup → appears in archived → admin restores → reappears

---

### Verification

- `nx run server:test` — all server unit + integration tests pass
- `nx run client:test` — all client unit + component tests pass
- `nx run client:build` — production build succeeds with no TS errors
- `docker compose up` → `nx run server:dev` → `nx run client:dev` → manual game flow works end-to-end
- Socket.IO reconnection: disconnect network → reconnect → game state restored
- Admin flows: seed admin → login → manage categories → moderate questions → notifications delivered

---

### Decisions

| Decision             | Choice                                                 | Rationale                                                                                                                                                             |
| -------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client state         | React Context + `useReducer`                           | Simpler, no extra dependency; GameContext reducer handles all game state transitions cleanly. Zustand can be adopted later if Context re-renders become a bottleneck. |
| Context scope        | GameProvider wraps only game routes                    | Prevents unnecessary re-renders across the whole app; game state resets naturally on route exit                                                                       |
| Server state         | TanStack Query                                         | Caching, background refetch, pagination — Context isn't suited for server-cache concerns                                                                              |
| Socket lifecycle     | Tied to AuthContext                                    | Connect only when authenticated, auto-disconnect on logout                                                                                                            |
| Timer authority      | Server-side only                                       | Client timer is cosmetic (driven by `game:timerTick` events); server enforces actual deadline to prevent cheating                                                     |
| Question security    | `correctIndex` never sent to client during active turn | Only revealed in `game:turnResult` after answer/timeout                                                                                                               |
| No Redis for v1      | Socket.IO in-memory adapter                            | Single-server deployment is fine initially; add Redis adapter when horizontal scaling is needed                                                                       |
| No animations for v1 | CSS transitions only                                   | Timer bar and answer reveal use CSS transitions; Framer Motion deferred                                                                                               |
| Monorepo tool        | Nx                                                     | Handles build orchestration, shared TS paths, and task caching                                                                                                        |
| No component library | Tailwind CSS only                                      | Full design control, smaller bundle, custom game aesthetic                                                                                                            |
