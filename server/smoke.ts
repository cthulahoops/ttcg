// server/smoke.ts
import { newGame } from "./game-server.js";
import { Game, runGame } from "../shared/game.js";
import { AIController } from "../shared/controllers.js";


const controllers: AIController[] = [];
for (let i = 0; i < 3; i++) {
  controllers.push(new AIController(0));
}

const game = newGame(controllers);

game.onLog = (l: any) => console.log(l);
game.onStateChange = () => {
  // optional: console.log("state changed");
};

await runGame(game);
console.log("done");
