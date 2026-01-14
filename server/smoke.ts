// server/smoke.ts
import { newGame } from "./game-server";
import { runGame } from "@shared/game";
import { AIController } from "@shared/controllers";


const controllers: AIController[] = [];
for (let i = 0; i < 2; i++) {
  controllers.push(new AIController(0));
}

const game = newGame(controllers);

game.onLog = (l: any) => console.log(l);
game.onStateChange = () => {
  // optional: console.log("state changed");
};

await runGame(game);
console.log("done");
