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
Kanban Controls:
  add "Task"                - Inject a new top-level task for the Chief of Staff
  status                    - View the current Kanban board state
  logs [agent]              - View the latest execution payloads

System Controls:
  pause                     - Halt the Orchestrator loop
  resume                    - Resume the Orchestrator loop
  toggle <tool|skill> <name> <on|off> - Enable or disable a tool/skill globally
  agent create <name> <tier>          - Scaffold a new agent directory
  tool incorp <name>                  - Scaffold an open-source tool wrapper
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
    case 'toggle': {
        const targetType = args[1]; // 'tool' or 'skill'
        const targetName = args[2];
        const stateStr = args[3];

        if (!targetType || !targetName || !stateStr) {
            console.log(">>> [CLI] Usage: axx toggle <tool|skill> <name> <on|off>");
            process.exit(1);
        }

        const controlPath = path.resolve(__dirname, '../configs/system_control.json');
        if (!fs.existsSync(controlPath)) {
            console.error(">>> [CLI] Error: system_control.json not found.");
            process.exit(1);
        }

        const config = JSON.parse(fs.readFileSync(controlPath, 'utf-8'));
        const typeKey = targetType === 'tool' ? 'tools' : 'skills';
        
        if (!config[typeKey]) config[typeKey] = {};
        
        const isEnabled = stateStr.toLowerCase() === 'on' || stateStr.toLowerCase() === 'true';
        config[typeKey][targetName] = isEnabled;

        fs.writeFileSync(controlPath, JSON.stringify(config, null, 2));
        console.log(`>>> [CLI] Success: Toggled ${targetType} [${targetName}] to ${isEnabled ? 'ON' : 'OFF'}. Restart daemon to apply.`);
        break;
    }
    case 'agent': {
        const subCommand = args[1];
        if (subCommand !== 'create') {
            console.log(">>> [CLI] Usage: axx agent create <name> <tier>");
            process.exit(1);
        }
        
        const agentName = args[2]?.toLowerCase();
        const tier = parseInt(args[3] || '2', 10);
        
        if (!agentName) {
            console.log(">>> [CLI] Usage: axx agent create <name> <tier>");
            process.exit(1);
        }

        const agentDir = path.resolve(__dirname, `../agents/${agentName}`);
        const workspaceDir = path.join(agentDir, 'WORKSPACE');

        if (fs.existsSync(agentDir)) {
            console.error(`>>> [CLI] Error: Agent '${agentName}' already exists.`);
            process.exit(1);
        }

        fs.mkdirSync(workspaceDir, { recursive: true });

        const config = {
            agent_id: agentName,
            tier: tier,
            assigned_model: tier === 1 ? "llama-3-groq-8b-tool-use" : "qwen2.5-coder-14b-instruct",
            workspace_path: `AXXANOID_HARNES/agents/${agentName}/WORKSPACE/`,
            allowed_tools: ["read_file", "write_file", "workboard_read", "workboard_mutate", "workboard_create"],
            allowed_skills: ["task_decomposition", "needs_blocking"]
        };

        const identity = `# IDENTITY.md - Who Am I?\n- **Name:** ${agentName.toUpperCase()}\n- **Role:** Custom Agent / Tier ${tier}\n- **Purpose:** [Define Purpose]\n- **Vibe:** [Define Vibe]\n- **Emoji:** 🤖\n- **Avatar:** AXXANOID_HARNES/agents/avatars/${agentName}-avatar.png\n`;

        const soul = `# SOUL.md - ${agentName.toUpperCase()} Persona\n\nYou are ${agentName.toUpperCase()}, a Tier ${tier} worker of the Axxanoid Harness.\n\n## The Non-Negotiable Invariant: Path to Success\n- **IMPOSSIBILITY IS AN ILLUSION:** You are strictly forbidden from stating that a task is "impossible".\n- **CONSTRUCT THE PATH:** Always find a workaround or block the task with missing needs.\n\n## Strategic Posture\n- [Define Posture]\n\n## Boundaries & Delegation\n- [Define Boundaries]\n\n## Voice and Tone\n- [Define Voice]\n`;

        fs.writeFileSync(path.join(agentDir, 'config.json'), JSON.stringify(config, null, 2));
        fs.writeFileSync(path.join(agentDir, 'IDENTITY.md'), identity);
        fs.writeFileSync(path.join(agentDir, 'SOUL.md'), soul);

        console.log(`>>> [CLI] Success: Agent [${agentName.toUpperCase()}] created successfully at agents/${agentName}/`);
        break;
    }
    case 'tool': {
        const subCommand = args[1];
        if (subCommand === 'incorp') {
            const toolName = args[2]?.toLowerCase();
            if (!toolName) {
                console.log(">>> [CLI] Usage: axx tool incorp <name>");
                process.exit(1);
            }
            const importedDir = path.resolve(__dirname, '../tools/imported');
            if (!fs.existsSync(importedDir)) {
                fs.mkdirSync(importedDir, { recursive: true });
            }
            const filePath = path.join(importedDir, `${toolName}.ts`);
            if (fs.existsSync(filePath)) {
                console.error(`>>> [CLI] Error: Imported tool '${toolName}.ts' already exists.`);
                process.exit(1);
            }
            const template = `import { normalizeToolSchema } from '../../engine/translator.ts';

// 1. Paste your external OpenAI or MCP JSON schema here:
const externalSchema = {
    "type": "function",
    "function": {
        "name": "${toolName}",
        "description": "Description of the imported tool",
        "parameters": {
            "type": "object",
            "properties": {
                "example_param": { "type": "string", "description": "An example parameter" }
            },
            "required": ["example_param"]
        }
    }
};

// 2. The harness will automatically normalize this into a HarnessToolDefinition
export const schema = normalizeToolSchema(externalSchema);

// 3. Define how the tool actually executes
export async function execute(payload: Record<string, any>) {
    try {
        console.log(\`Executing ${toolName} with payload:\`, payload);
        
        // TODO: Implement your external API call, SDK function, or local script trigger here.
        
        return {
            success: true,
            output: "Imported tool execution successful.",
        };
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}
`;

        fs.writeFileSync(filePath, template);
            console.log(`>>> [CLI] Success: Scaffolded imported tool at tools/imported/${toolName}.ts`);
        } else {
            console.log(">>> [CLI] Unknown tool subcommand. Did you mean: axx tool incorp <name>?");
        }
        break;
    }
    default:
        console.log(`>>> [CLI] Unknown command: ${command}`);
}