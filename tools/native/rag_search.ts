import path from 'path';
import { spawn } from 'child_process';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'rag_search',
    description: 'Search the vector database (long-term memory) to retrieve archived conversations, profiles, or code snippets.',
    type: 'tool',
    parameters: {
        query: { type: 'string', description: 'The semantic question or text string to search for', required: true },
        collection: { type: 'string', description: 'The database category (e.g., "souls", "knowledge", "archive")', required: true },
        limit: { type: 'number', description: 'Number of chunks to return (default 3)', required: false }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    const venvPython = path.resolve('axx_env/bin/python');
    const scriptPath = path.resolve('tools/rag_bridge.py');
    
    return new Promise((resolve) => {
        let stdout = '';
        const proc = spawn(venvPython, [scriptPath, 'search', JSON.stringify(payload)]);
        
        proc.stdout.on('data', (data) => stdout += data.toString());
        proc.on('close', (code) => {
            try {
                const result = JSON.parse(stdout.trim());
                resolve(result);
            } catch (err: any) {
                resolve({ success: false, output: '', error: 'Python bridge crashed: ' + stdout });
            }
        });
    });
}