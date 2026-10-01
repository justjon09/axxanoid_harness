export function pyIncorpTemplate (toolName: string, pyPath: string) {
    return `import path from 'path';
    import { spawn } from 'child_process';
    import { HarnessToolDefinition } from '../../engine/translator.ts';

    export const schema: HarnessToolDefinition = {
        name: '${toolName}',
        description: 'Auto-incorporated Python script: ${pyPath}',
        type: 'tool',
        parameters: {
            payload_json: { type: 'string', description: 'JSON string of arguments for the script', required: false }
        },
        handler_type: 'cli'
    };

    export async function execute(payload: Record<string, any>) {
        const venvPython = path.resolve('axx_env/bin/python');
        const scriptPath = path.resolve('${pyPath}');
        
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            const proc = spawn(venvPython, [scriptPath, JSON.stringify(payload)]);
            
            proc.stdout.on('data', (data) => stdout += data.toString());
            proc.stderr.on('data', (data) => stderr += data.toString());
            
            proc.on('close', (code) => {
                resolve({
                    success: code === 0,
                    output: stdout.trim(),
                    error: code !== 0 ? stderr.trim() : undefined
                });
            });
        });
    }
    `;
}