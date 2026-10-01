import fs from 'fs';
import path from 'path';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'read_file',
    description: 'Read the text content of a file from disk.',
    type: 'tool',
    parameters: {
        path: { type: 'string', description: 'Relative path of the file to read', required: true }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    if (!payload.path) {
        return {
            success: false,
            output: '',
            error: 'Missing required payload: "path" (string).'
        };
    }
    
    try {
        const filePath = path.resolve(payload.path);
        
        if (!fs.existsSync(filePath)) {
            return {
                success: false,
                output: '',
                error: `File not found on disk: ${payload.path}`
            };
        }
        
        const content = fs.readFileSync(filePath, 'utf-8');
        
        return {
            success: true,
            output: content
        };
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}