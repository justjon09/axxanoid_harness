import fs from 'fs';
import path from 'path';
import { HarnessToolDefinition } from '../../engine/translator.ts';

// Re-exporting ToolResult interface here temporarily until we build the auto-loader
export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'write_file',
    description: 'Write or overwrite a physical file on the disk.',
    type: 'tool',
    parameters: {
        path: { type: 'string', description: 'Relative path where file should be saved (e.g. ./scripts/hello.py)', required: true },
        content: { type: 'string', description: 'Exact raw file contents to write', required: true }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    if (!payload.path || typeof payload.content !== 'string') {
        return {
            success: false,
            output: '',
            error: 'Missing required payload: "path" (string) and "content" (string).'
        };
    }
    
    try {
        const filePath = path.resolve(payload.path);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, payload.content, 'utf-8');
        
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
            return {
                success: false,
                output: '',
                error: `File write verification failed. File at ${payload.path} was not created or is empty.`
            };
        }
        
        return {
            success: true,
            output: `Successfully wrote ${payload.content.length} characters to ${payload.path}`
        };
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}