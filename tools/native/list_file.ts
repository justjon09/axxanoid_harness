import fs from 'fs';
import path from 'path';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'list_files',
    description: 'List all files and folders in a given directory.',
    type: 'tool',
    parameters: {
        path: { type: 'string', description: 'Directory path to inspect (defaults to .)', required: false }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    try {
        const targetDir = path.resolve(payload.path || '.');
        
        if (!fs.existsSync(targetDir)) {
            return {
                success: false,
                output: '',
                error: `Directory not found: ${targetDir}`
            };
        }
        
        const files = fs.readdirSync(targetDir);
        
        return {
            success: true,
            output: JSON.stringify(files, null, 2)
        };
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}