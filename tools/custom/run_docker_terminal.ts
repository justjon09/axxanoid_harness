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
    name: 'run_docker_terminal',
    description: 'Execute a command safely inside an ephemeral Docker container. The specified workspace directory is bind-mounted to /app inside the container. Use this for testing untrusted code or when specific environments (Node, Python) are required.',
    type: 'tool',
    parameters: {
        command: { type: 'string', description: 'The shell command to execute inside the container (e.g., "npm test" or "pytest")', required: true },
        image: { type: 'string', description: 'The Docker image to use (e.g., "node:20", "python:3.11", "ubuntu:latest")', required: true },
        target_dir: { type: 'string', description: 'Relative path in the workspace to mount. Defaults to current directory "."', required: false }
    },
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    if (!payload.command || !payload.image) {
        return { success: false, output: '', error: 'Missing required payload: command or image.' };
    }

    try {
        const targetDir = path.resolve(process.cwd(), payload.target_dir || '.');
        
        if (!fs.existsSync(targetDir)) {
            return { success: false, output: '', error: `Target directory does not exist: ${targetDir}` };
        }

        // Build the Docker command arguments
        // --rm destroys the container when finished
        // -v mounts the host directory to /app
        // -w sets the working directory to /app
        const dockerArgs = [
            'run',
            '--rm',
            '-v', `${targetDir}:/app`,
            '-w', '/app',
            payload.image,
            '/bin/sh', '-c', payload.command
        ];

        const result = await new Promise<{stdout: string, stderr: string, code: number | null}>((resolve) => {
            let stdout = '';
            let stderr = '';
            
            const proc = spawn('docker', dockerArgs, { cwd: targetDir });
            
            proc.stdout.on('data', (data) => stdout += data.toString());
            proc.stderr.on('data', (data) => stderr += data.toString());
            
            proc.on('close', (code) => resolve({ stdout, stderr, code }));
            proc.on('error', (err) => resolve({ stdout, stderr: err.message, code: 1 }));
        });

        const logPayload = {
            docker_image: payload.image,
            command: payload.command,
            stdout: result.stdout.trim(),
            stderr: result.stderr.trim(),
            exit_code: result.code
        };

        const success = result.code === 0;

        return {
            success: success,
            output: JSON.stringify(logPayload, null, 2),
            error: success ? undefined : `Docker execution failed with exit code ${result.code}`
        };

    } catch (err: any) {
        return { success: false, output: '', error: err.message || String(err) };
    }
}
