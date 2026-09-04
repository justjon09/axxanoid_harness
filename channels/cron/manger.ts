import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { broadcastUpdate } from '../web/ws-server.ts';

const CONTROL_FILE = path.resolve(process.cwd(), 'configs/system_control.json');
const activeIntervals = new Map<string, NodeJS.Timeout>();

export function syncCrons() {
    if (!fs.existsSync(CONTROL_FILE)) return;
    
    const config = JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf-8'));
    const crons = config.crons || {};

    for (const [cronId, data] of Object.entries<any>(crons)) {
        // Clear existing interval to reset state
        if (activeIntervals.has(cronId)) {
            clearInterval(activeIntervals.get(cronId));
            activeIntervals.delete(cronId);
        }

        if (data.enabled) {
            const timer = setInterval(() => runCronScript(cronId, data.script), data.interval_ms);
            activeIntervals.set(cronId, timer);
            console.log(`>>> [CRON] Mounted and active: ${cronId} (${data.interval_ms}ms)`);
        }
    }
}

async function runCronScript(cronId: string, scriptPath: string) {
    const absolutePath = path.resolve(process.cwd(), scriptPath);
    const pythonExec = path.resolve(process.cwd(), 'axx_env/bin/python');

    if (!fs.existsSync(absolutePath)) {
        console.warn(`>>> [CRON ERROR] Script not found: ${absolutePath}`);
        return;
    }

    broadcastUpdate('telemetry_log', `[CRON] Executing scheduled pipeline: ${cronId}`);

    // Spawn completely detached from the Node event loop
    const child = spawn(pythonExec, [absolutePath], { 
        detached: true, 
        stdio: 'ignore',
        cwd: path.dirname(absolutePath)
    });
    child.unref(); 
}