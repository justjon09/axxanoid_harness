import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export async function executeTool(target: string, payload: Record<string, any>): Promise<ToolResult> {
    try {
        switch (target) {
            case 'write_file': {
                if (!payload.path || typeof payload.content !== 'string') {
                    return {
                        success: false,
                        output: '',
                        error: 'Missing required payload: "path" (string) and "content" (string).'
                    };
                }

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
            }

            case 'read_file': {
                if (!payload.path) {
                    return {
                        success: false,
                        output: '',
                        error: 'Missing required payload: "path" (string).'
                    };
                }

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
            }

            case 'list_files': {
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
            }

            case 'run_terminal': {
                if (!payload.command) {
                    return {
                        success: false,
                        output: '',
                        error: 'Missing required payload: "command" (string).'
                    };
                }

                let commandToRun = payload.command;
                const venvPython = path.resolve('axx_env/bin/python');

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
            }

            default:
                return {
                    success: false,
                    output: '',
                    error: `Unrecognized tool target: "${target}"`
                };
        }
    } catch (err: any) {
        return {
            success: false,
            output: err.stdout ? err.stdout.trim() : '',
            error: err.stderr ? err.stderr.trim() : (err.message || String(err))
        };
    }
}