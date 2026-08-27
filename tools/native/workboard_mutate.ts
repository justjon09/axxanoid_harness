import { db } from '../../app/database.ts';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'workboard_mutate',
    description: 'Update the status or payload of a workboard card. Use this to mark a task as blocked with missing needs.',
    type: 'tool',
    parameters: {
        card_id: { type: 'string', description: 'ID of the card to update', required: true },
        status: { type: 'string', description: 'New status (e.g., blocked, ready, done)', required: true },
        result_payload: { type: 'string', description: 'JSON string detailing missing needs, triage info, or task outcomes', required: false }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    if (!payload.card_id || !payload.status) {
        return { success: false, output: '', error: 'Missing required payload: card_id or status.' };
    }

    try {
        let query = 'UPDATE workboard_cards SET status = ?, updated_at = CURRENT_TIMESTAMP';
        const params: any[] = [payload.status.toLowerCase()];

        if (payload.result_payload !== undefined) {
            query += ', result_payload = ?';
            params.push(payload.result_payload);
        }

        query += ' WHERE id = ?';
        params.push(payload.card_id);

        const result = db.prepare(query).run(...params);

        if (result.changes === 0) {
            return { success: false, output: '', error: `Card ID [${payload.card_id}] not found.` };
        }

        return {
            success: true,
            output: `Successfully mutated card [${payload.card_id}] to status: ${payload.status.toUpperCase()}`
        };
    } catch (err: any) {
        return { success: false, output: '', error: err.message || String(err) };
    }
}