import { db } from '../../app/database.ts';
import { HarnessToolDefinition } from '../../engine/translator.ts';
import crypto from 'crypto';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'workboard_create',
    description: 'Create a new task card on the workboard. Use this to delegate sub-tasks.',
    type: 'tool',
    parameters: {
        title: { type: 'string', description: 'Title of the task', required: true },
        description: { type: 'string', description: 'Detailed instructions for the task', required: true },
        assignee: { type: 'string', description: 'Agent to assign (axxbot, noid, execubot, dobot, pubbot)', required: true },
        parent_id: { type: 'string', description: 'ID of the parent card this belongs to, if any. ONLY use if you have an exact valid task ID (e.g., task-12345678). Otherwise, omit entirely.', required: false },
        depends_on_ids: { type: 'string', description: 'Comma-separated list of card IDs that must be DONE before this card is READY', required: false }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    if (!payload.title || !payload.assignee || !payload.description) {
        return { success: false, output: '', error: 'Missing required payload: title, description, or assignee.' };
    }

    try {

        // --- SAFETY GATE: Prevent Foreign Key Crashes ---
        // Verify parent_id exists in the database
        if (payload.parent_id) {
            const parent = db.prepare('SELECT id FROM workboard_cards WHERE id = ?').get(payload.parent_id);
            if (!parent) {
                console.warn(`[WARNING] Invalid parent_id '${payload.parent_id}' hallucinated. Nullifying.`);
                payload.parent_id = null; // Strip invalid parent ID
            }
        }

        // Verify all depends_on_ids exist in the database
        let validDepIds: string[] = [];
        if (payload.depends_on_ids) {
            const depIds = payload.depends_on_ids.split(',').map((id: string) => id.trim());
            for (const depId of depIds) {
                if (depId) {
                    const dep = db.prepare('SELECT id FROM workboard_cards WHERE id = ?').get(depId);
                    if (dep) {
                        validDepIds.push(depId);
                    } else {
                        console.warn(`[WARNING] Invalid depends_on_id '${depId}' hallucinated. Dropping.`);
                    }
                }
            }
        }

        const newCardId = `task-${crypto.randomUUID().slice(0, 8)}`;
        const initialStatus = payload.depends_on_ids ? 'blocked' : 'ready';

        const insertCard = db.prepare(`
            INSERT INTO workboard_cards (id, title, description, assignee, status, parent_id) 
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        // Execute inside a transaction to ensure dependencies link safely
        const transaction = db.transaction(() => {
            insertCard.run(
                newCardId, 
                payload.title, 
                payload.description, 
                payload.assignee.toLowerCase(), 
                initialStatus, 
                payload.parent_id || null
            );

            if (validDepIds.length > 0) {
                const insertDep = db.prepare(`INSERT INTO card_dependencies (card_id, depends_on_id) VALUES (?, ?)`);
                for (const depId of validDepIds) {
                    insertDep.run(newCardId, depId);
                }
            }
        });

        transaction();

        return {
            success: true,
            output: `Successfully created card [${newCardId}] assigned to ${payload.assignee.toUpperCase()}.`
        };
    } catch (err: any) {
        return { success: false, output: '', error: err.message || String(err) };
    }
}