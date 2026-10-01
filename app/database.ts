import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '../memory.db');
export const db = new Database(dbPath);

// Crucial pragmas for concurrent Node.js / Python access
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

export function initWorkboardSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS workboard_cards (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            assignee TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ready',
            parent_id TEXT,
            result_payload TEXT,
            inherited_parent_result TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_id) REFERENCES workboard_cards(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS card_dependencies (
            card_id TEXT NOT NULL,
            depends_on_id TEXT NOT NULL,
            PRIMARY KEY (card_id, depends_on_id),
            FOREIGN KEY (card_id) REFERENCES workboard_cards(id) ON DELETE CASCADE,
            FOREIGN KEY (depends_on_id) REFERENCES workboard_cards(id) ON DELETE CASCADE
        );
    `);
    console.log(">>> [DATABASE] Shared SQLite Workboard schema initialized in WAL mode.");
}

export function initChatSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
    console.log(">>> [DATABASE] Command Center Chat schema initialized.");
}