import "dotenv/config";
import WebSocket from "ws";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const readline = createInterface({ input, output });

async function main(): Promise<void> {
  const accessToken = await readline.question(
    "Paste your access token for this local test: ",
  );

  const socket = new WebSocket("ws://localhost:3000/ws");

  socket.on("open", () => {
    console.log("[Test] WebSocket connection established.");

    socket.send(
      JSON.stringify({
        type: "auth",
        accessToken,
      }),
    );
  });

  socket.on("message", (data) => {
    console.log("[Test] Server response:");
    console.log(data.toString());
  });

  socket.on("close", (code, reason) => {
    console.log("[Test] Connection closed:", {
      code,
      reason: reason.toString(),
    });

    readline.close();
  });

  socket.on("error", (error) => {
    console.error("[Test] WebSocket connection failed:", error);
    readline.close();
  });
}

void main();