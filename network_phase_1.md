Here is the updated, step-by-step implementation plan for **Phase 1: Project Restructuring** of the Server-Authoritative (Plan A) architecture.

This phase is purely about plumbing—getting your files in the right places and making TypeScript happy so that both your Browser and your Node.js server can share the same game logic.

### Phase 1: Project Restructuring

**Goal:** Create a clean separation between Client, Server, and Shared code, and ensure the build system works for both.

---

#### Step 1: Create Directory Structure
Execute these commands (or move manually) to reorganize your codebase.

```bash
# 1. Create the three main zones
mkdir client server shared

# 2. Move core logic to 'shared' (This is code used by BOTH)
mv game.ts shared/
mv hands.ts shared/
mv seat.ts shared/
mv types.ts shared/
mv controllers.ts shared/
mv characters/ shared/characters/ # Move the whole directory

# 3. Move browser-specific logic to 'client' (This is code ONLY for the browser)
mv display.ts client/
mv utils.ts client/
mv game.css client/
mv index.html client/

# 4. Create empty server entry points
touch server/server.ts
touch server/game-server.ts
touch server/room-manager.ts
```

#### Step 2: Install Dependencies
We need packages for the server and build tools for the new structure.

```bash
# Dependencies for the server
npm install express socket.io

# Dependencies for the client
npm install socket.io-client

# Dev tools (TypeScript execution and type definitions)
npm install --save-dev tsx @types/express @types/node
```

#### Step 3: Configure `package.json`
Update your root `package.json` to handle the two environments.

```json
{
  "type": "module",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "tsx watch server/server.ts",
    "dev:client": "vite",
    "build": "tsc -b",
    "start": "node dist/server/server.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "socket.io": "^4.7.5",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.12.7",
    "concurrently": "^8.2.2",
    "tsx": "^4.7.2",
    "typescript": "^5.4.5",
    "vite": "^5.2.0"
  }
}
```

#### Step 4: Create TypeScript Configurations
We use "Project References" to allow the server and client to use different settings (like DOM vs Node) while sharing code.

**1. `tsconfig.json` (Root)**
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.shared.json" },
    { "path": "./tsconfig.client.json" },
    { "path": "./tsconfig.server.json" }
  ]
}
```

**2. `tsconfig.shared.json`**
*Target ES2020 so it works in both Node 20 and modern browsers.*
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "bundler",
    "strict": true,
    "composite": true,
    "rootDir": "."
  },
  "include": ["shared"]
}
```

**3. `tsconfig.server.json`**
*Target NodeNext for the backend.*
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "composite": true
  },
  "include": ["server", "shared"],
  "references": [{ "path": "./tsconfig.shared.json" }]
}
```

**4. `tsconfig.client.json`**
*Includes DOM libraries for the browser.*
```json
{
  "extends": "./tsconfig.shared.json",
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "noEmit": true
  },
  "include": ["client", "shared"],
  "references": [{ "path": "./tsconfig.shared.json" }]
}
```

#### Step 5: Fix Imports & Remove DOM from Shared Code
This is the most critical manual step. The code in `shared/` **cannot** reference `window`, `document`, `HTMLElement`, or any UI code in `client/`.

**A. Update File Paths:**
Go through every file in `shared/` and `client/`. Update imports to point to the new locations.
*   Old: `import { Card } from './types'`
*   New: `import { Card } from '../shared/types.js'` (Note the `.js` extension—it's required for Node ESM).

**B. Decouple `Game.ts`:**
Open `shared/game.ts`. It currently calls `displayHands`, `updateTricksDisplay`, etc. This breaks the server because the server has no screen.

1.  **Remove imports** to `client/display.js` or `client/utils.js`.
2.  **Add a callback hook** to the Game class:
    ```typescript
    export class Game {
      // Add this optional callback
      public onStateChange?: (game: Game) => void;

      private notifyChange() {
        if (this.onStateChange) {
          this.onStateChange(this);
        }
      }
      // ...
    }
    ```
3.  **Replace display calls** with `this.notifyChange()`:
    *   Find lines like `displayHands(this.seats);`
    *   Replace them with `this.notifyChange();`

**C. Sanitize `Hands.ts`:**
Open `shared/hands.ts`.
1.  Remove any `render()` methods inside the classes.
2.  Remove imports related to DOM elements.
3.  (Rendering logic will be moved to `client/hand-renderer.ts` in Phase 4, for now just deleting it is fine to get the server building).

#### Step 6: Verify
Run the build check to see if we missed anything.

```bash
npm run build
```

If this command passes without errors, you have successfully separated your logic from your UI, and you are ready to start building the Server!
