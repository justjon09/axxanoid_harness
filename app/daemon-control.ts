import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './database.ts';
import { broadcastUpdate } from '../channels/web/ws-server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BASE_DIR = path.resolve(__dirname, '..');
const CONFIG_DIR = path.join(BASE_DIR, 'configs');

function loadDirective(filename: string): string {
    const filepath = path.join(CONFIG_DIR, filename);
    try {
        return fs.readFileSync(filepath, 'utf-8').trim();
    } catch (error) {
        return '';
    }
}

function parseHeartbeatConfig(mdContent: string) {
    const auditList: {script: string, name: string, description: string}[] = [];
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
    return auditList;
}

export async function runHeartbeat() {
    try {
        console.log(">>> [HEARTBEAT] Running System Health Audits...");
        broadcastUpdate('telemetry_log', '[HEARTBEAT] Running system health audits...');

        const heartbeatMd = loadDirective("HEARTBEAT.md");
        const auditList = parseHeartbeatConfig(heartbeatMd);

        // Verify Database Integrity (Basic Check)
        try {
            db.prepare('SELECT 1 FROM workboard_cards LIMIT 1').get();
        } catch (dbError: any) {
            console.error(`>>> [HEARTBEAT FATAL] Database integrity check failed: ${dbError.message}`);
            return; // Can't even log tasks if the DB is offline
        }

        // Execute Python Audits
        for (const audit of auditList) {
            const scriptPath = path.join(CONFIG_DIR, 'audit', audit.script);

            if (!fs.existsSync(scriptPath)) {
                console.warn(`>>> [HEARTBEAT WARNING] Audit script missing: ${scriptPath}`);
                continue;
            }

            console.log(`    -> [AUDIT] Running ${audit.name}...`);

            try {
                const pythonExec = path.resolve(BASE_DIR, 'axx_env/bin/python');
                const result = await new Promise<{stdout: string, stderr: string, code: number | null}>((resolve) => {
                    let stdout = '';
                    let stderr = '';
                    const proc = spawn(pythonExec, [scriptPath]);

                    proc.stdout.on('data', (data) => stdout += data.toString());
                    proc.stderr.on('data', (data) => stderr += data.toString());

                    proc.on('close', (code) => resolve({ stdout, stderr, code }));
                    proc.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
                });

                // If the script fails or exits with an error code, escalate to AxxBot
                if (result.code !== 0) {
                    console.error(`>>> [HEARTBEAT ERROR] ${audit.name} failed with Exit Code ${result.code}`);
                    
                    const taskId = `task-${crypto.randomUUID().slice(0, 8)}`;
                    const errorDesc = `The background heartbeat detected a failure during '${audit.name}'.\n\nScript Description: ${audit.description}\nExit Code: ${result.code}\nSTDERR:\n${result.stderr.trim()}\nSTDOUT:\n${result.stdout.trim()}`;
                    
                    // Inject a Ready card for AxxBot directly into the Workboard
                    db.prepare(`
                        INSERT INTO workboard_cards (id, title, description, assignee, status) 
                        VALUES (?, ?, ?, 'axxbot', 'ready')
                    `).run(
                        taskId, 
                        `[SYSTEM ALERT] Audit Failed: ${audit.name}`, 
                        errorDesc
                    );

                    broadcastUpdate('board_refresh', {});
                    broadcastUpdate('telemetry_log', `[HEARTBEAT ALERT] Task ${taskId} dispatched to AxxBot for audit failure.`);
                }
            } catch (e: any) {
                console.error(`>>> [HEARTBEAT EXCEPTION] Failed to execute ${audit.name}: ${e.message}`);
            }
        }
        console.log(">>> [HEARTBEAT] Audits complete. System nominal.");
    } catch (e: any) {
        console.error(`>>> [HEARTBEAT FATAL] ${e.message}`);
    }
}