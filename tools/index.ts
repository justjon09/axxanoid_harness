import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {normalizeToolSchema, HarnessToolDefinition } from '../engine/translator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The exact precedence hierarchy for tool discovery (Highest to Lowest)
const TOOL_DIRECTORIES = ['custom', 'agent-built', 'imported', 'native'];

// Shared interface for execution results
export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export interface RegisteredTool {
    schema: HarnessToolDefinition;
    execute: Function;
    sourceDir: string;
}

export const ToolRegistry = new Map<string, RegisteredTool>();
export const SYSTEM_TOOLS: HarnessToolDefinition[] = [];

/**
 * Recursively scans directory trees to find all TypeScript/JavaScript module files.
*/
function discoverToolFiles(dirPath: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dirPath)) return results;

    const list = fs.readdirSync(dirPath);
    for (const item of list) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(discoverToolFiles(fullPath));
        } else if (item.endsWith('.ts') || item.endsWith('.js')) {
            // Ignore declaration files and the index itself
            if (!item.endsWith('.d.ts') && item !== 'index.ts') {
                results.push(fullPath);
            }
        }
    }
    return results;
}

/**
 * Initializes the Tool Engine by loading tools in order of precedence:
 * custom > agent-built > imported > native
 */
export async function initializeToolEngine() {
    console.log(">>> [TOOL ENGINE] Scanning hierarchical directories for modules...");
    ToolRegistry.clear();
    SYSTEM_TOOLS.length = 0;

    // Read Master System Control
    const controlPath = path.resolve(__dirname, '../configs/system_control.json');
    let sysControl: any = { tools: {} };
    if (fs.existsSync(controlPath)) {
        sysControl = JSON.parse(fs.readFileSync(controlPath, 'utf-8'));
    }

    // Process directories in strict order from HIGHEST to LOWEST priority
    for (const tierDir of TOOL_DIRECTORIES) {
        const dirPath = path.join(__dirname, tierDir);
        const filePaths = discoverToolFiles(dirPath);

        for (const filePath of filePaths) {
            try {
                const module = await import(filePath);

                // Diagnostic Boot Audit
                if (!module.schema || !module.execute) {
                    throw new Error(`[BOOT VERIFICATION FAILED] File ${filePath} is missing required 'schema' or 'execute' exports.`);
                }
                if (!module.schema.name) {
                    throw new Error(`[BOOT VERIFICATION FAILED] Tool at ${filePath} has a malformed schema (missing 'name').`);
                }

                // Apply universal adapter ONLY to 'imported' tools.
                // Native, custom, and agent-built tools must strictly adhere to HarnessToolDefinition.
                const finalSchema = tierDir === 'imported' 
                    ? normalizeToolSchema(module.schema) 
                    : module.schema;

                const toolName = finalSchema.name;

                // System Control Killswitch
                if (sysControl.tools && sysControl.tools[toolName] === false) {
                    console.warn(`    -> [SYSTEM CONTROL] Tool [${toolName}] disabled globally. Skipping.`);
                    continue;
                }

                // Precedence Check based on actual schema name
                if (ToolRegistry.has(toolName)) {
                    const existing = ToolRegistry.get(toolName)!;
                    console.log(`    -> [PRECEDENCE OVERRIDE] Skipped /${tierDir}/${path.basename(filePath)} ('${toolName}' registered by higher-priority /${existing.sourceDir})`);
                    continue;
                }

                ToolRegistry.set(toolName, {
                    schema: finalSchema,
                    execute: module.execute,
                    sourceDir: tierDir
                });

                SYSTEM_TOOLS.push(finalSchema);
                console.log(`    -> Registered Tool: [${toolName}] from /${tierDir}`);

            } catch (e: any) {
                // If it's a critical verification failure, crash the boot sequence immediately
                if (e.message.includes('[BOOT VERIFICATION FAILED]')) {
                    throw e; 
                }
                console.error(`>>> [TOOL ENGINE ERROR] Failed to load ${filePath}: ${e.message}`);
            }
        }
    }
    console.log(`>>> [TOOL ENGINE] Boot complete. Registered ${ToolRegistry.size} unique tool(s) in active registry.`);
}

export async function executeTool(target: string, payload: Record<string, any>): Promise<ToolResult> {
    const tool = ToolRegistry.get(target);

    if (!tool) {
        return {
            success: false,
            output: '',
            error: `Unrecognized tool target: "${target}"`
        };
    }
    
    return await tool.execute(payload);
}