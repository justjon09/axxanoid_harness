import fs from 'fs';
import { PAUSE_FILE } from './index.ts';

export function workboardResume() {
    if (fs.existsSync(PAUSE_FILE)) fs.unlinkSync(PAUSE_FILE);
    console.log(">>> [CLI] Orchestrator RESUMED.");
}