import fs from 'fs';
import path from 'path';
import { __dirname } from './index.js';
import { initializeToolEngine, ToolRegistry } from '../../../../tools/index.js';
import { initializeSkillEngine, SkillRegistry } from '../../../../skills/index.js';

export async function systemAudit() {
    console.log("\n>>> [CLI] Running System Audit...\n");

    // 1. Boot engines to capture physical files on disk
    await initializeToolEngine();
    await initializeSkillEngine();
    console.log("\n------------------------------------------------");

    const agentsDir = path.resolve(__dirname, '../../../../agents');
    if (!fs.existsSync(agentsDir)) {
        console.error(">>> [CLI] Error: Agents directory not found.");
        process.exit(1);
    }

    const agentFolders = fs.readdirSync(agentsDir).filter(f => fs.statSync(path.join(agentsDir, f)).isDirectory());
    let totalErrors = 0;

    for (const agent of agentFolders) {
        const configPath = path.join(agentsDir, agent, 'config.json');
        if (!fs.existsSync(configPath)) continue;

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const tools = config.allowed_tools || [];
        const skills = config.allowed_skills || [];

        const missingTools: string[] = [];
        const missingSkills: string[] = [];

        // Check Tools (with Wildcard Support)
        const availableTools = Array.from(ToolRegistry.keys());
        for (const t of tools) {
            if (t.endsWith('*')) {
                const prefix = t.slice(0, -1);
                if (!availableTools.some(at => at.startsWith(prefix))) missingTools.push(t);
            } else {
                if (!ToolRegistry.has(t)) missingTools.push(t);
            }
        }

        // Check Skills (with Wildcard Support)
        const availableSkills = Array.from(SkillRegistry.keys());
        for (const s of skills) {
            if (s.endsWith('*')) {
                const prefix = s.slice(0, -1);
                if (!availableSkills.some(as => as.startsWith(prefix))) missingSkills.push(s);
            } else {
                if (!SkillRegistry.has(s)) missingSkills.push(s);
            }
        }

        // Output Status
        if (missingTools.length > 0 || missingSkills.length > 0) {
            console.log(`[!] AGENT: ${agent.toUpperCase()}`);
            if (missingTools.length > 0) {
                console.log(`    Missing Tools:  ${missingTools.join(', ')}`);
                totalErrors += missingTools.length;
            }
            if (missingSkills.length > 0) {
                console.log(`    Missing Skills: ${missingSkills.join(', ')}`);
                totalErrors += missingSkills.length;
            }
        } else {
            console.log(`[OK] AGENT: ${agent.toUpperCase()} - All constraints verified.`);
        }
    }

    console.log("------------------------------------------------");
    if (totalErrors === 0) {
        console.log(`>>> [CLI] Audit Complete. System is 100% verified and healthy.\n`);
    } else {
        console.log(`>>> [CLI] Audit Complete. Found ${totalErrors} missing dependencies.\n`);
    }
}