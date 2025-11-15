# Boop Online

A monorepo implementation of the two-player board game **boop.** featuring a reusable TypeScript game engine, a React + Vite front-end with hot-seat, AI, and online play, and a Node.js + WebSocket backend that keeps remote games in sync.

## Project Structure

```
packages/
  game-engine/   Pure TypeScript rules engine with Jest tests
  client/        React UI (Vite) with local, AI, and online modes
  server/        Express + ws WebSocket service for multiplayer rooms
```

## Getting Started

1. **Install dependencies** (from the repo root):

   ```bash
   npm install
   npm install --workspace packages/client
   npm install --workspace packages/server
   ```

2. **Build the shared engine** (needed once so TypeScript emits declaration files):

   ```bash
   npm run build --workspace @boop/game-engine
   ```

## Running Locally

### Game engine tests

```bash
npm run test --workspace @boop/game-engine
```

### React client

```bash
npm run dev --workspace @boop/client
```

The client reads `VITE_WS_URL` (defaults to `ws://localhost:4000/ws`). Set it in a `.env` file or via the command line if your server runs elsewhere.

### WebSocket server

```bash
npm run dev --workspace @boop/server
```

The server exposes WebSockets at `/ws` and a simple health check at `/health`. Configure the port with the `PORT` environment variable (default `4000`).

## Architecture Highlights

### `@boop/game-engine`

- Exposes `createInitialBoard`, `simulateMove`, and `applyMove` along with typed helpers for `Board`, `Move`, `Piece`, etc.
- Implements the full rule-set: forced removals at 8 pieces, boops (blocked, off-board, or diagonal), kitten graduation, cat supply tracking, and both win conditions.
- Includes comprehensive Jest coverage for placement, boops, supply updates, removals, and win detection.

### React client

- Uses the shared engine for both actual moves and hover previews via `computeBoopPreview`.
- Modes:
  - **Hot-seat:** pass-and-play with removal selection and supply tracking.
  - **Solo (Easy/Hard):** two-tier AI built from legal move enumeration and a simple heuristic evaluation.
  - **Online:** WebSocket-powered rooms with reconnect support, session storage, and highlight syncing.
- UI niceties: board animations, reserve panels, contextual status text, and an online control panel for creating/joining rooms.

### Node WebSocket server

- Express HTTP shell with a `ws` server at `/ws`.
- Supports room creation/join, authoritative `simulateMove` state updates, last-move broadcast, and reconnects via session IDs stored on the client.
- Periodically prunes empty/idle rooms.

## Known TODOs / Future Enhancements

- Persist online rooms to durable storage (currently in-memory only).
- Add authentication or invite links for public deployments.
- Improve AI heuristics (line detection, defensive moves) and add difficulty tuning controls.
- Expand UI accessibility (keyboard controls) and add sounds/visual polish.
- Automate workspace bootstrapping (`npm install --workspaces`) instead of per-package installs.
