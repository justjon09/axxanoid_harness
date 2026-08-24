import { db } from './database.ts';
import { sendLlamaCompletion, ChatMessage } from '../engine/llama-client.ts';
import { parseAgentAction } from '../engine/translator.ts';

export interface WorkboardCard {
    id: string;
    title: string;
    description: string | null;
    assignee: string; // 'noid' | 'execubot' | 'dobot' | 'pubbot' | 'axxbot'
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
 * Moves task to 'in_prgress', envokes model, ingest result and update tak accordingly. 
 */
export async function processTask(task: WorkboardCard) {
    // 1. Mark task in_progress
    db.prepare(`
        UPDATE workboard_cards 
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).run(task.id);

    console.log(`>>> [ORCHESTRATOR] Processing Task [${task.id}] with Assignee [${task.assignee.toUpperCase()}]`);

    try {
        // Select model based on agent tier
        const modelName = task.assignee === 'axxbot' ? 'llama3_groq' : 'qwen_coder';
        
        const messages: ChatMessage[] = [
            { role: 'system', content: `You are ${task.assignee.toUpperCase()}, an active worker agent in Axxanoid OS.` },
            { role: 'user', content: `Task: ${task.title}\nDetails: ${task.description || 'None'}` }
        ];

        // 2. Dispatch to Local Engine
        const completion = await sendLlamaCompletion(messages, { model: modelName });
        
        // 3. Intercept & Parse Action
        const action = parseAgentAction(completion.content);

        // 4. Update task completion state
        db.prepare(`
            UPDATE workboard_cards 
            SET status = 'done', result_payload = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(JSON.stringify(action), task.id);

        console.log(`>>> [ORCHESTRATOR] Task [${task.id}] Completed Successfully.`);
    } catch (error: any) {
        db.prepare(`
            UPDATE workboard_cards 
            SET status = 'failed', result_payload = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        `).run(JSON.stringify({ error: error.message }), task.id);

        console.error(`>>> [ORCHESTRATOR] Task [${task.id}] Execution Failed: ${error.message}`);
    }
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
                // Execution dispatch
                await processTask(task);
            }
        }
    } catch (error: any) {
        console.error(`>>> [ORCHESTRATOR ERROR] ${error.message}`);
    }
}