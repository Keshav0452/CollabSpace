import app from "./app.js";
import { pool } from "./config/database.js";

const PORT = Number(process.env.PORT ?? 3000);

async function startServer() {
  try {
    await pool.query("SELECT 1");

    console.log("Database connection successful.");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    await pool.end();
    process.exitCode = 1;
  }
}

startServer();
