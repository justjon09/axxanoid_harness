import { db } from './index.ts' 

export function getLogs(args: string[]) {
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
}