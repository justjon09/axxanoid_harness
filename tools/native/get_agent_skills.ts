import fs from 'fs';
import path from 'path';
import { HarnessToolDefinition } from '../../engine/translator.ts';

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export const schema: HarnessToolDefinition = {
    name: 'get_agent_skills',
    description: 'Retrieve the exact skills, tools, and tier level for every agent currently configured in the system.',
    type: 'tool',
    parameters: {},
    handler_type: 'typescript'
};

export async function execute(payload: Record<string, any>): Promise<ToolResult> {
    try {
        const agentsDir = path.resolve(process.cwd(), 'agents');
        if (!fs.existsSync(agentsDir)) return { success: false, output: '', error: 'Agents directory not found.' };

        const roster: Record<string, any> = {};
        const folders = fs.readdirSync(agentsDir);

        for (const folder of folders) {
            const configPath = path.join(agentsDir, folder, 'config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                roster[config.agent_id] = {
                    tier: config.tier,
                    allowed_skills: config.allowed_skills || [],
                    allowed_tools: config.allowed_tools || []
                };
            }
        }

        return {
            success: true,
            output: JSON.stringify(roster, null, 2)
        };
    } catch (err: any) {
        return { success: false, output: '', error: err.message || String(err) };
    }
}