import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from '../app/database.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PAUSE_FILE = path.resolve(__dirname, '../.PAUSED');

// --- HELPER: Discover Tier 1 Agent dynamically ---
function getTier1AgentId(): string {
    const agentsDir = path.resolve(__dirname, '../agents');
    if (!fs.existsSync(agentsDir)) return 'axxbot';
    
    for (const folder of fs.readdirSync(agentsDir)) {
        const configPath = path.join(agentsDir, folder, 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.tier === 1) return config.agent_id;
        }
    }
    return 'axxbot';
}

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
    console.log(`
Axxanoid OS - CEO CLI
---------------------
Commands:
  add "Task"     - Inject a new top-level task for the Chief of Staff
  status         - View the current Kanban board state
  pause          - Halt the Orchestrator loop
  resume         - Resume the Orchestrator loop
  logs [agent]   - View the latest execution payloads
    `);
    process.exit(0);
}

switch (command) {
    case 'add': {
        const title = args.slice(1).join(' ');
        if (!title) {
            console.error(">>> [CLI] Error: Please provide a task description.");
            process.exit(1);
        }
        const id = `task-${crypto.randomUUID().slice(0, 8)}`;
        const tier1 = getTier1AgentId();
        
        db.prepare(`
            INSERT INTO workboard_cards (id, title, description, assignee, status) 
            VALUES (?, ?, ?, ?, 'ready')
        `).run(id, title, "CEO request directly via CLI.", tier1);
        
        console.log(`>>> [CLI] Success: Added Task [${id}] for [${tier1.toUpperCase()}]: "${title}"`);
        break;
    }
    case 'status': {
        const cards = db.prepare(`SELECT id, title, assignee, status FROM workboard_cards ORDER BY created_at DESC`).all() as any[];
        console.log(`\n=== WORKBOARD STATUS ===`);
        const grouped: Record<string, any[]> = { ready: [], in_progress: [], blocked: [], done: [], failed: [] };
        cards.forEach(c => { if (grouped[c.status]) grouped[c.status].push(c); });
        
        ['blocked', 'in_progress', 'ready', 'failed', 'done'].forEach(status => {
            console.log(`\n[ ${status.toUpperCase()} ] (${grouped[status].length})`);
            grouped[status].slice(0, 5).forEach(c => {
                console.log(`  -> [${c.id}] (${c.assignee.toUpperCase()}) ${c.title}`);
            });
        });
        break;
    }
    case 'pause': {
        fs.writeFileSync(PAUSE_FILE, 'paused');
        console.log(">>> [CLI] Orchestrator PAUSED. Existing tasks will finish, but no new tasks will be picked up.");
        break;
    }
    case 'resume': {
        if (fs.existsSync(PAUSE_FILE)) fs.unlinkSync(PAUSE_FILE);
        console.log(">>> [CLI] Orchestrator RESUMED.");
        break;
    }
    case 'logs': {
        const agent = args[1] || 'all';
        let query = `SELECT id, title, result_payload, updated_at FROM workboard_cards WHERE result_payload IS NOT NULL `;
        const params: any[] = [];
        if (agent !== 'all') { 
            query += `AND assignee = ? `; 
            params.push(agent.toLowerCase()); 
        }
        query += `ORDER BY updated_at DESC LIMIT 3`;
        
        const logs = db.prepare(query).all(...params) as any[];
        console.log(`\n=== LATEST LOGS (${agent.toUpperCase()}) ===`);
        logs.forEach(l => {
            console.log(`\n--- Task: ${l.id} (${l.title}) ---`);
            try {
                console.log(JSON.stringify(JSON.parse(l.result_payload), null, 2));
            } catch {
                console.log(l.result_payload);
            }
        });
        break;
    }
    default:
        console.log(`>>> [CLI] Unknown command: ${command}`);
}