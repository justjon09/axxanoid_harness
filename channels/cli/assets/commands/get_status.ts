import { db } from './index.ts';

export function getStatus() {
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
};