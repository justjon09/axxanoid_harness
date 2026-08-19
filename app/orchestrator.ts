import { db } from './database.ts';

export interface WorkboardCard {
    id: string;
    title: string;
    description: string | null;
    assignee: string; // 'noid' | 'execubot' | 'dobot' | 'pubbot'
    status: 'ready' | 'in_progress' | 'blocked' | 'done' | 'failed';
    parent_id: string | null;
    result_payload: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Sweeps the database for blocked tasks whose dependencies are all complete,
 * automatically promoting them to 'ready' (The Domino Effect).
 */
export function resolveDependencies() {
    // Find all 'blocked' cards
    const blockedCards = db.prepare(`
        SELECT * FROM workboard_cards WHERE status = 'blocked'
    `).all() as WorkboardCard[];

    for (const card of blockedCards) {
        // Check if there are any incomplete dependencies for this card
        const unresolvedDep = db.prepare(`
            SELECT cd.depends_on_id 
            FROM card_dependencies cd
            JOIN workboard_cards wc ON cd.depends_on_id = wc.id
            WHERE cd.card_id = ? AND wc.status != 'done'
            LIMIT 1
        `).get(card.id);

        // If no incomplete dependencies remain, unblock the card
        if (!unresolvedDep) {
            db.prepare(`
                UPDATE workboard_cards 
                SET status = 'ready', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(card.id);
            console.log(`>>> [ORCHESTRATOR] Unblocked card "${card.title}" (${card.id}) -> Promoted to READY`);
        }
    }
}

/**
 * Fetches the next available 'ready' cards assigned to worker agents.
 */
export function getReadyTasks(): WorkboardCard[] {
    return db.prepare(`
        SELECT * FROM workboard_cards 
        WHERE status = 'ready' 
        ORDER BY created_at ASC
    `).all() as WorkboardCard[];
}

/**
 * Main orchestrator pulse function.
 */
export async function runOrchestratorPulse() {
    try {
        // Step 1: Auto-unblock child cards whose parent dependencies completed
        resolveDependencies();

        // Step 2: Fetch unblocked tasks ready for execution
        const readyTasks = getReadyTasks();

        if (readyTasks.length > 0) {
            console.log(`>>> [ORCHESTRATOR] Found ${readyTasks.length} READY task(s) on Workboard.`);
            for (const task of readyTasks) {
                console.log(`    -> [CARD ${task.id}] Assigned to: ${task.assignee.toUpperCase()} | Title: "${task.title}"`);
                // Execution dispatch (Step 6 engine translation layer) will connect here
            }
        }
    } catch (error: any) {
        console.error(`>>> [ORCHESTRATOR ERROR] ${error.message}`);
    }
}