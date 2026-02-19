const session = require('express-session');
const pool = require('./db');
const { logger } = require('../utils/logger');

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const sanitizeIdentifier = (value, fallback) => {
  const clean = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '');
  return clean || fallback;
};

class MySQLSessionStore extends session.Store {
  constructor(options = {}) {
    super();
    this.pool = options.pool || pool;
    this.logger = options.logger || logger;
    this.tableName = sanitizeIdentifier(options.tableName, 'user_sessions');
    this.defaultTtlMs = Number(options.defaultTtlMs || DEFAULT_TTL_MS);
    this.cleanupIntervalMs = Number(options.cleanupIntervalMs || 15 * 60 * 1000);
    this.readyPromise = this.ensureTable();
    this.startCleanupLoop();
  }

  async ensureTable() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS \`${this.tableName}\` (
        session_id VARCHAR(128) NOT NULL PRIMARY KEY,
        expires_at BIGINT UNSIGNED NOT NULL,
        data MEDIUMTEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_expires_at (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  }

  startCleanupLoop() {
    if (!Number.isFinite(this.cleanupIntervalMs) || this.cleanupIntervalMs <= 0) {
      return;
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired((err) => {
        if (err) {
          this.logger.error('Erro ao limpar sessoes expiradas:', err);
        }
      });
    }, this.cleanupIntervalMs);

    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  close() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  ready() {
    return this.readyPromise;
  }

  run(operation, callback) {
    this.readyPromise
      .then(() => operation())
      .then((result) => callback(null, result))
      .catch((err) => callback(err));
  }

  getExpirationMs(sess) {
    if (sess && sess.cookie) {
      if (sess.cookie.expires) {
        const expires = new Date(sess.cookie.expires).getTime();
        if (Number.isFinite(expires)) {
          return expires;
        }
      }

      if (Number.isFinite(sess.cookie.maxAge)) {
        return Date.now() + Number(sess.cookie.maxAge);
      }
    }

    return Date.now() + this.defaultTtlMs;
  }

  get(sid, callback = () => {}) {
    this.run(async () => {
      const [rows] = await this.pool.query(
        `SELECT data, expires_at FROM \`${this.tableName}\` WHERE session_id = ? LIMIT 1`,
        [sid]
      );

      if (!rows || rows.length === 0) {
        return null;
      }

      const row = rows[0];
      if (Number(row.expires_at) <= Date.now()) {
        await this.pool.query(`DELETE FROM \`${this.tableName}\` WHERE session_id = ?`, [sid]);
        return null;
      }

      return JSON.parse(row.data);
    }, callback);
  }

  set(sid, sess, callback = () => {}) {
    this.run(async () => {
      const expiresAt = this.getExpirationMs(sess);
      const data = JSON.stringify(sess);

      await this.pool.query(
        `
          INSERT INTO \`${this.tableName}\` (session_id, expires_at, data)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            expires_at = VALUES(expires_at),
            data = VALUES(data),
            updated_at = CURRENT_TIMESTAMP
        `,
        [sid, expiresAt, data]
      );
    }, callback);
  }

  touch(sid, sess, callback = () => {}) {
    this.run(async () => {
      const expiresAt = this.getExpirationMs(sess);
      await this.pool.query(
        `
          UPDATE \`${this.tableName}\`
          SET expires_at = ?, updated_at = CURRENT_TIMESTAMP
          WHERE session_id = ?
        `,
        [expiresAt, sid]
      );
    }, callback);
  }

  destroy(sid, callback = () => {}) {
    this.run(async () => {
      await this.pool.query(`DELETE FROM \`${this.tableName}\` WHERE session_id = ?`, [sid]);
    }, callback);
  }

  clear(callback = () => {}) {
    this.run(async () => {
      await this.pool.query(`DELETE FROM \`${this.tableName}\``);
    }, callback);
  }

  length(callback = () => {}) {
    this.run(async () => {
      const [rows] = await this.pool.query(`SELECT COUNT(*) AS count FROM \`${this.tableName}\``);
      return rows[0].count || 0;
    }, callback);
  }

  cleanupExpired(callback = () => {}) {
    this.run(async () => {
      await this.pool.query(`DELETE FROM \`${this.tableName}\` WHERE expires_at < ?`, [Date.now()]);
    }, callback);
  }
}

const createSessionStore = (options = {}) => {
  const isProduction = Boolean(options.isProduction);
  const modeFromEnv = String(process.env.SESSION_STORE || '').toLowerCase().trim();
  const mode = modeFromEnv || (isProduction ? 'mysql' : 'memory');

  if (mode === 'memory') {
    return { mode: 'memory', store: new session.MemoryStore() };
  }

  if (mode === 'mysql') {
    const store = new MySQLSessionStore({
      tableName: process.env.SESSION_TABLE || 'user_sessions',
      cleanupIntervalMs: Number(process.env.SESSION_CLEANUP_INTERVAL_MS || 15 * 60 * 1000),
      defaultTtlMs: Number(process.env.SESSION_TTL_MS || DEFAULT_TTL_MS),
    });
    return { mode: 'mysql', store };
  }

  logger.warn(`SESSION_STORE invalido (${modeFromEnv}). Usando MemoryStore.`);
  return { mode: 'memory', store: new session.MemoryStore() };
};

module.exports = {
  MySQLSessionStore,
  createSessionStore,
};
