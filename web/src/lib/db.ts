import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? 'app',
  password: process.env.DB_PASS ?? 'apppass',
  database: process.env.DB_NAME ?? 'second_brain',
  waitForConnections: true,
  connectionLimit: 10,
});

export async function migrate() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      email       VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS connections (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      type        ENUM('ai', 'tg_bot', 'tg_account') NOT NULL,
      config_json TEXT NOT NULL,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY user_type (user_id, type),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      user_id       INT NOT NULL,
      chat_id       BIGINT NOT NULL,
      chat_name     VARCHAR(255),
      chat_type     ENUM('private', 'group', 'channel') DEFAULT 'private',
      message_id    BIGINT NOT NULL,
      sender_name   VARCHAR(255),
      text          TEXT NOT NULL,
      source        ENUM('import', 'live') DEFAULT 'import',
      original_date DATETIME,
      edited_at     DATETIME NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_msg (user_id, chat_id, message_id),
      INDEX idx_user_date (user_id, original_date),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    ALTER TABLE messages ADD FULLTEXT KEY ft_text (text, sender_name, chat_name)
  `).catch(() => {});

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS tg_sessions (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      user_id            INT NOT NULL UNIQUE,
      session_string_enc TEXT NOT NULL,
      phone              VARCHAR(30),
      updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS import_jobs (
      id           VARCHAR(36) PRIMARY KEY,
      user_id      INT NOT NULL,
      status       ENUM('pending','running','done','error') DEFAULT 'pending',
      progress     INT DEFAULT 0,
      total        INT DEFAULT 0,
      current_chat VARCHAR(255),
      error        TEXT,
      started_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NOT NULL,
      tg_id        BIGINT NOT NULL,
      name         VARCHAR(255),
      username     VARCHAR(255),
      contact_type ENUM('user','bot','channel','group') DEFAULT 'user',
      first_seen   DATETIME,
      last_seen    DATETIME,
      msg_count    INT DEFAULT 0,
      meta_json    TEXT,
      UNIQUE KEY uq_contact (user_id, tg_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chat_blocks (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      user_id    INT NOT NULL,
      chat_id    BIGINT NOT NULL,
      chat_name  VARCHAR(255),
      chat_type  ENUM('private','group','channel') DEFAULT 'private',
      blocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_block (user_id, chat_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

export default pool;
