import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { HarnessToolDefinition } from '../../engine/translator.ts';

const execAsync = promisify(exec);

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'run_terminal',
    description: 'Execute a terminal command or Python script in the axx_env sandbox.',
    type: 'tool',
    parameters: {
        command: { type: 'string', description: 'Shell command to execute', required: true }
    },
    handler_type: 'cli'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    if (!payload.command) {
        return {
            success: false,
            output: '',
            error: 'Missing required payload: "command" (string).'
        };
    }
    
    try {
        let commandToRun = payload.command;
        const venvPython = path.resolve('axx_env/bin/python');
        
        // Isolate python execution inside the axx_env sandbox
        if (commandToRun.startsWith('python ') || commandToRun.startsWith('python3 ')) {
            if (fs.existsSync(venvPython)) {
                commandToRun = commandToRun.replace(/^python3?/, venvPython);
            }
        }
        
        const { stdout, stderr } = await execAsync(commandToRun, {
            timeout: 30000,
            cwd: process.cwd()
        });
        
        if (stderr && stderr.trim().length > 0 && !stdout) {
            return {
                success: false,
                output: stdout ? stdout.trim() : '',
                error: stderr.trim()
            };
        }
        
        return {
            success: true,
            output: stdout.trim() || stderr.trim() || 'Command executed with zero return output.'
        };
    } catch (err: any) {
        return {
            success: false,
            output: err.stdout ? err.stdout.trim() : '',
            error: err.stderr ? err.stderr.trim() : (err.message || String(err))
        };
    }
}