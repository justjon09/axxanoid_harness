import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(BASE_DIR, 'configs');

function loadDirective(filename: string): string {
    const filepath = path.join(CONFIG_DIR, filename);
    try {
        return fs.readFileSync(filepath, 'utf-8').trim();
    } catch (error) {
        console.warn(`>>> [HEARTBEAT WARNING] Missing directive file: ${filename}. Skipping.`);
        return `[System Note: ${filename} is currently missing or inaccessible.]`;
    }
}

function parseHeartbeatConfig(mdContent: string) {
    const promptList: string[] = [];
    const auditList: {script: string, name: string, description: string}[] = [];

    // Parse Prompts
    const promptMatch = mdContent.match(/Heartbeat Prompt List Items:\s*\[([\s\S]*?)\]/);
    if (promptMatch) {
        const lines = promptMatch[1].trim().split('\n');
        for (const line of lines) {
            const cleanLine = line.trim().replace(/^"|"$/g, '').replace(/,$/, '');
            if (cleanLine) promptList.push(cleanLine);
        }
    }

    // Parse Audits
    const auditMatch = mdContent.match(/Run audits:\s*\[([\s\S]*?)\]/);
    if (auditMatch) {
        const lines = auditMatch[1].trim().split('\n');
        for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('#')) continue;

            const scriptMatch = cleanLine.match(/\{script:\s*(.*?),\s*name:\s*(.*?),\s*description:\s*"(.*?)"\}/);
            if (scriptMatch) {
                auditList.push({
                    script: scriptMatch[1].trim(),
                    name: scriptMatch[2].trim(),
                    description: scriptMatch[3].trim()
                });
            }
        }
    }
    return { promptList, auditList };
}

export async function runHeartbeat() {
    try {
        // 1. UI Control Check (Mocked until DB ORM is connected)
        const cronActive = true; 
        if (!cronActive) {
            console.log(">>> [HEARTBEAT] Cron is disabled via system config setting.");
            return;
        }

        // 2. State Collision Check
        const qStatus = "idle";
        if (['thinking', 'executing'].includes(qStatus)) {
            console.log(`>>> [HEARTBEAT] Q is currently ${qStatus}. Skipping heartbeat to protect VRAM.`);
            return;
        }

        console.log(">>> [HEARTBEAT] Wake sequence initiated. Ingesting core directives into RAM...");

        const soulMd = loadDirective("SOUL.md");
        const identityMd = loadDirective("IDENTITY.md");
        const humanMd = loadDirective("HUMAN.md");
        const heartbeatMd = loadDirective("HEARTBEAT.md");

        const { promptList, auditList } = parseHeartbeatConfig(heartbeatMd);

        // 3. System Audit (Executing Python securely inside TS)
        console.log(">>> [HEARTBEAT] Executing dynamic audits from HEARTBEAT.md...");
        let auditReport = "=== SYSTEM AUDIT REPORT ===\n";

        for (const audit of auditList) {
            const scriptPath = path.join(CONFIG_DIR, 'audit', audit.script);
            if (fs.existsSync(scriptPath)) {
                console.log(`\n [HEARTBEAT][AUDIT: ${audit.name}] ${audit.description} Running....`);
                try {
                    // THE BRIDGE: TypeScript calls the isolated Python venv
                    const pythonExec = path.join(BASE_DIR, 'axx_env', 'bin', 'python');
                    
                    const result = await new Promise<{stdout: string, stderr: string}>((resolve, reject) => {
                        let stdout = '';
                        let stderr = '';
                        const proc = spawn(pythonExec, [scriptPath]);
                        proc.stdout.on('data', (data) => stdout += data.toString());
                        proc.stderr.on('data', (data) => stderr += data.toString());
                        proc.on('close', (code) => {
                            if (code === 0) resolve({stdout, stderr});
                            else reject(new Error(`Process exited with code ${code}: ${stderr}`));
                        });
                    });

                    const output = result.stdout.trim() ? result.stdout.trim() : "NOMINAL";
                    auditReport += `[${audit.name}]: ${output}\n`;
                } catch (e: any) {
                    auditReport += `[${audit.name} FAILED]: ${e.message}\n`;
                }
            } else {
                auditReport += `[${audit.name} WARNING]: Script not found at ${scriptPath}\n`;
            }
        }

        // DB Chat Pull and stream_agent_response() will be attached here in the next phase.
        console.log(">>> [HEARTBEAT] Audit complete. Ready for Engine Inference.");
        
    } catch (e: any) {
        console.error(`>>> [HEARTBEAT FATAL] ${e.message}`);
    }
}