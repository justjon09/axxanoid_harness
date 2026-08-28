import crypto from 'crypto';
import { db, getTier1AgentId } from './index.ts';

export function addTask (args: string[]) {
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
};