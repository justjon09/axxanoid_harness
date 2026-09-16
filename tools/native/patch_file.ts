import fs from 'fs';
import path from 'path';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'patch_file',
    description: 'Surgically replace a specific text string inside an existing file. Use this to edit files without re-writing the entire document.',
    type: 'tool',
    parameters: {
        path: { type: 'string', description: 'Relative path of the file to edit', required: true },
        old_string: { type: 'string', description: 'The exact original string to be replaced', required: true },
        new_string: { type: 'string', description: 'The new string to insert', required: true }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    if (!payload.path || !payload.old_string || payload.new_string === undefined) {
        return { success: false, output: '', error: 'Missing required payload: path, old_string, or new_string.' };
    }

    try {
        const filePath = path.resolve(payload.path);
        if (!fs.existsSync(filePath)) {
            return { success: false, output: '', error: `File not found on disk: ${payload.path}` };
        }

        let content = fs.readFileSync(filePath, 'utf-8');
        if (!content.includes(payload.old_string)) {
            return { success: false, output: '', error: `Target 'old_string' was not found in ${payload.path}. Ensure exact character matching.` };
        }

        content = content.replace(payload.old_string, payload.new_string);
        fs.writeFileSync(filePath, content, 'utf-8');

        return {
            success: true,
            output: `Successfully patched ${payload.path}. Replaced target string.`
        };
    } catch (err: any) {
        return { success: false, output: '', error: err.message || String(err) };
    }
}