import { db } from '../../app/database.ts';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'chat_search',
    description: 'Search past conversation history by keyword or date limit.',
    type: 'tool',
    parameters: {
        keyword: { type: 'string', description: 'Keyword to search for in messages', required: false },
        limit: { type: 'string', description: 'Number of past messages to return', required: false }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    try {
        let query = 'SELECT role, content, timestamp FROM chat_history WHERE 1=1';
        const params: any[] = [];

        if (payload.keyword) {
            query += ' AND content LIKE ?';
            params.push(`%${payload.keyword}%`);
        }

        query += ' ORDER BY id DESC LIMIT ?';
        params.push(parseInt(payload.limit || '20', 10));

        const results = db.prepare(query).all(...params);
        
        return {
            success: true,
            output: JSON.stringify(results.reverse(), null, 2)
        };
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}