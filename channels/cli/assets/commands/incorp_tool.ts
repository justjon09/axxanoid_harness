import fs from 'fs';
import path from 'path';
import { pyIncorpTemplate } from '../../assets/templates/py.ts';
import { mcpIncorpTemplate } from '../../assets/templates/mcp.ts';

export function incorpTool(args: string[]) {
    const mode = args[2]?.toLowerCase(); // 'python' or 'mcp'
    const importedDir = path.resolve(__dirname, '../../tools/imported');

    if (!fs.existsSync(importedDir)) {
        fs.mkdirSync(importedDir, { recursive: true });
    }

    // Python Sandbox Auto-Inspector
    if (mode === 'python') {
        const pyPath = args[3];
        if (!pyPath) {
            console.log(">>> [CLI] Usage: axx tool incorp python <filepath>");
            process.exit(1);
        }
        const toolName = path.basename(pyPath, '.py').toLowerCase();
        const filePath = path.join(importedDir, `${toolName}.ts`);
        const pyTemplate = pyIncorpTemplate(toolName, pyPath);
        fs.writeFileSync(filePath, pyTemplate);
        console.log(`>>> [CLI] Success: Auto-wired Python script to tools/imported/${toolName}.ts`);
    
        // MCP Server Auto-Importer
    } else if (mode === 'mcp') {
        const toolName = args[3]?.toLowerCase();
        const mcpCommand = args.slice(4).join(' ');

        if (!toolName || !mcpCommand) {
            console.log(">>> [CLI] Usage: axx tool incorp mcp <name> <start_command>");
            process.exit(1);
        }
        const filePath = path.join(importedDir, `${toolName}.ts`);
        const mcpTemplate = mcpIncorpTemplate(toolName, mcpCommand);

        fs.writeFileSync(filePath, mcpTemplate);
        console.log(`>>> [CLI] Success: Auto-wired MCP server to tools/imported/${toolName}.ts`);
    }else {
        console.log(">>> [CLI] Unknown mode. Usage: axx tool incorp <python|mcp> ...");
    }
}