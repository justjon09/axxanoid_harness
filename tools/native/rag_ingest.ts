import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { HarnessToolDefinition } from '../../engine/translator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'rag_ingest',
    description: 'Save large blocks of text, code, or documentation into the vector database (long-term memory).',
    type: 'tool',
    parameters: {
        text: { type: 'string', description: 'The actual text or code to save', required: true },
        source: { type: 'string', description: 'The filename or source name of the text', required: true },
        collection: { type: 'string', description: 'The database category (e.g., "souls", "knowledge", "archive")', required: true }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    const venvPython = path.resolve(__dirname, '../../axx_env/bin/python');
    const scriptPath = path.resolve(__dirname, '../rag_bridge.py');
    
    return new Promise((resolve) => {
        let stdout = '';
        const proc = spawn(venvPython, [scriptPath, 'ingest', JSON.stringify(payload)]);
        
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