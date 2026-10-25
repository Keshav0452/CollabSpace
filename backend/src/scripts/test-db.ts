
import { pool } from "../config/database.js";

async function testDatabaseConnection() {
  try {
    const result = await pool.query(`
      SELECT
        current_database() AS database,
        current_user AS user,
        NOW() AS server_time;
    `);

    console.log("Database connection successful!");
    console.log(result.rows[0]);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
