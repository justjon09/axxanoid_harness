import { db } from '../../app/database.ts';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'workboard_read',
    description: 'Read cards from the Kanban workboard. Can filter by ID, status, or assignee.',
    type: 'tool',
    parameters: {
        card_id: { type: 'string', description: 'Specific card ID to read', required: false },
        status: { type: 'string', description: 'Filter by status (e.g., ready, blocked, done)', required: false },
        assignee: { type: 'string', description: 'Filter by assigned agent (e.g., noid, execubot)', required: false }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    try {
        let query = 'SELECT * FROM workboard_cards WHERE 1=1';
        const params: any[] = [];

        if (payload.card_id) {
            query += ' AND id = ?';
            params.push(payload.card_id);
        }
        if (payload.status) {
            query += ' AND status = ?';
            params.push(payload.status);
        }
        if (payload.assignee) {
            query += ' AND assignee = ?';
            params.push(payload.assignee);
        }

        const cards = db.prepare(query).all(...params);
        
        return {
            success: true,
            output: JSON.stringify(cards, null, 2)
        };
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}