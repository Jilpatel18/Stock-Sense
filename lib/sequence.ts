import { PoolClient } from "pg";

export async function getNextDocumentNumber(
  client: PoolClient | null,
  prefix: "REC" | "DEL" | "TRF" | "ADJ"
): Promise<string> {
  const runner = async (c: PoolClient) => {
    await c.query(
      `INSERT INTO document_sequences (prefix, last_val) VALUES ($1, 0) ON CONFLICT (prefix) DO NOTHING`,
      [prefix]
    );

    const res = await c.query(
      `UPDATE document_sequences SET last_val = last_val + 1 WHERE prefix = $1 RETURNING last_val`,
      [prefix]
    );

    const lastVal = res.rows[0].last_val;
    const padded = String(lastVal).padStart(6, "0");
    return `${prefix}-${padded}`;
  };

  if (client) {
    return await runner(client);
  } else {
    // Isolated transaction if client wasn't passed
    const { pool } = await import("./db");
    const cl = await pool.connect();
    try {
      await cl.query("BEGIN");
      const docNum = await runner(cl);
      await cl.query("COMMIT");
      return docNum;
    } catch (err) {
      await cl.query("ROLLBACK");
      throw err;
    } finally {
      cl.release();
    }
  }
}
