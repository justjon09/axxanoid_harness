import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { HarnessToolDefinition } from '../../engine/translator.ts';

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

        const result = await new Promise<{stdout: string, stderr: string, code: number | null}>((resolve) => {
            let stdout = '';
            let stderr = '';
            
            // Use spawn with bash -c to handle pipes/redirects and prevent buffer limit crashes
            const proc = spawn('bash', ['-c', commandToRun], { cwd: process.cwd() });
            
            proc.stdout.on('data', (data) => stdout += data.toString());
            proc.stderr.on('data', (data) => stderr += data.toString());
            
            proc.on('close', (code) => resolve({ stdout, stderr, code }));
            proc.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
        });

        // Standardized logging payload mapping exactly to standard streams
        const logPayload = {
            command: commandToRun,
            stdout: result.stdout.trim(),
            stderr: result.stderr.trim(),
            exit_code: result.code
        };

        const success = result.code === 0;
        
        return {
            success: success,
            output: JSON.stringify(logPayload, null, 2),
            error: success ? undefined : `Command failed with exit code ${result.code}`
        };
        
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}