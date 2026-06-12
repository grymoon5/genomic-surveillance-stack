const os = require('os');
const path = require('path');
const DuckDB: any = require('duckdb');

const dbFile = path.resolve(__dirname, '..', 'data.duckdb');
let db = new DuckDB.Database(dbFile);

const ensureDb = async (): Promise<void> => {
  return new Promise((resolve) => {
    db.all('SELECT 1 AS x', (err: any) => {
      if (err) {
        console.error('DuckDB persistent database failed, falling back to in-memory:', err);
        db = new DuckDB.Database(':memory:');
      }
      resolve();
    });
  });
};

export const runQuery = async (sql: string, params: unknown[] = []): Promise<any[]> => {
  await ensureDb();
  const isSelect = /^\s*(SELECT|PRAGMA)\b/i.test(sql);
  return new Promise((resolve, reject) => {
    if (isSelect) {
      if (params && params.length > 0) {
        db.all(sql, params, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
      } else {
        db.all(sql, (err: any, res: any) => {
          if (err) reject(err);
          else resolve(res);
        });
      }
      return;
    }

    // Use db.run for non-select statements. Some duckdb bindings don't accept params for DDL,
    // so fall back to calling without params if parameter mismatch occurs.
    db.run(sql, params, (err: any) => {
      if (!err) return resolve([]);
      const msg = String(err && err.message || err);
      if (msg.includes('Parameter argument/count mismatch') || msg.includes('excess parameters')) {
        db.run(sql, (err2: any) => {
          if (err2) reject(err2);
          else resolve([]);
        });
      } else {
        reject(err);
      }
    });
  });
};

export const allQuery = runQuery;

export async function initDB() {
  await runQuery(`
    CREATE TABLE IF NOT EXISTS infection_logs (
      id VARCHAR,
      case_type VARCHAR,
      lng DOUBLE,
      lat DOUBLE,
      timestamp TIMESTAMP
    );
  `);
}