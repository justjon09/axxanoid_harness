import fs from 'fs';
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
        const venvPath = path.resolve(__dirname, '../../axx_env');
        const venvBin = path.join(venvPath, 'bin');

        // Programmatically enforce the virtual environment
        const jailCwd = path.resolve(__dirname, '../../workspaces/shared');
        if (!fs.existsSync(jailCwd)) {
            fs.mkdirSync(jailCwd, { recursive: true });
        }

        const env = { 
            ...process.env, 
            VIRTUAL_ENV: venvPath,
            PATH: `${venvBin}:${process.env.PATH}` 
        };

        const result = await new Promise<{stdout: string, stderr: string, code: number | null}>((resolve) => {
            let stdout = '';
            let stderr = '';
            
            // Use spawn with bash -c to handle pipes/redirects and prevent buffer limit crashes
            const proc = spawn('bash', ['-c', commandToRun], { cwd: jailCwd, env });
            
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
            error: success ? undefined : `Command failed (Code ${result.code}). STDERR: ${result.stderr.trim()}`
        };
        
    } catch (err: any) {
        return {
            success: false,
            output: '',
            error: err.message || String(err)
        };
    }
}