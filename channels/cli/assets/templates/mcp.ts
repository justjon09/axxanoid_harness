export function mcpIncorpTemplate (toolName: string, mcpCommand: string) {
    return `import { spawn } from 'child_process';
    import { HarnessToolDefinition } from '../../engine/translator.ts';

    export const schema: HarnessToolDefinition = {
        name: '${toolName}',
        description: 'MCP Server Tool Wrapper for: ${mcpCommand}',
        type: 'tool',
        parameters: {
            query: { type: 'string', description: 'The operation or query to pass to the MCP server', required: true }
        },
        handler_type: 'mcp'
    };

    export async function execute(payload: Record<string, any>) {
        return new Promise((resolve) => {
            let stdout = '';
            let stderr = '';
            
            // Spawns the MCP server and communicates via stdio JSON-RPC
            const proc = spawn(${JSON.stringify(mcpCommand)}, { shell: true });
            
            proc.stdin.write(JSON.stringify({
                jsonrpc: "2.0",
                method: "tools/call",
                params: { name: "${toolName}", arguments: payload },
                id: 1
            }) + '\\n');
            proc.stdin.end();

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