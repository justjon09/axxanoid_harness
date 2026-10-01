import fs from 'fs';
import { PAUSE_FILE } from './index.ts';

export function workboardPause() {
    fs.writeFileSync(PAUSE_FILE, 'paused');
    console.log(">>> [CLI] Orchestrator PAUSED. Existing tasks will finish, but no new tasks will be picked up.");
}