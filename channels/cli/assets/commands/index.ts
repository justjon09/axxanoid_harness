import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

// --- HELPERS --- //

// --- HELPER: Discover Tier 1 Agent dynamically ---
export function getTier1AgentId(): string {
    const agentsDir = path.resolve(__dirname, '../../../../agents');
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

// Helper to execute the Python RAG bridge synchronously
export async function runBridge (mode: string, payload: any) {
    const venvPython = path.resolve(__dirname, '../../../../axx_env/bin/python');
    const scriptPath = path.resolve(__dirname, '../../../../tools/rag_bridge.py');
    const proc = spawnSync(venvPython, [scriptPath, mode, JSON.stringify(payload)], { encoding: 'utf-8' });
    if (proc.stdout && proc.stdout.trim()) console.log(proc.stdout.trim());
    if (proc.stderr && proc.stderr.trim()) console.error(proc.stderr.trim());
};

// --- PASSING --- //
export { db } from '../../../../app/database.ts';

// --- CONSTANTS --- //
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);
export const PAUSE_FILE = path.resolve(__dirname, '../../.PAUSED');

// --- COMMANDS --- //
export { addTask } from './add_task.ts';
export { getStatus } from './get_status.ts';
export { getLogs } from './get_logs.ts';
export { systemSwitch } from './system_switch.ts';
export { workboardPause } from './workboard_pause.ts';
export { workboardResume } from './workboard_resume.ts';
export { agentCreate } from './agent_create.ts';
export { incorpTool } from './incorp_tool.ts';
export { memoryRebuild } from './memory_rebuild.ts'