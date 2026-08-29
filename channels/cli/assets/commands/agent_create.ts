import fs from 'fs';
import path from 'path';
import { __dirname } from './index.ts';

export function agentCreate (args: string[]) {
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

    const agentDir = path.resolve(__dirname, `../../agents/${agentName}`);
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
}