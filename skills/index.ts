import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tiered Precedence Order (Highest Priority -> Lowest Priority)
const SKILL_DIRECTORIES = ['custom', 'agent-built', 'imported', 'native'];

export interface RegisteredSkill {
    id: string;
    content: string;
    sourceDir: string;
}

export const SkillRegistry = new Map<string, RegisteredSkill>();

/**
 * Recursively scans directory trees to find all Markdown (.md) files.
 */
function discoverSkillFiles(dirPath: string): string[] {
    let results: string[] = [];
    if (!fs.existsSync(dirPath)) return results;

    const list = fs.readdirSync(dirPath);
    for (const item of list) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            results = results.concat(discoverSkillFiles(fullPath));
        } else if (item.endsWith('.md')) {
            results.push(fullPath);
        }
    }
    return results;
}

/**
 * Initializes the Skill Engine by loading markdown files in order of precedence.
 */
export async function initializeSkillEngine() {
    console.log(">>> [SKILL ENGINE] Scanning hierarchical directories for playbooks...");
    SkillRegistry.clear();

    for (const tierDir of SKILL_DIRECTORIES) {
        const dirPath = path.join(__dirname, tierDir);
        const filePaths = discoverSkillFiles(dirPath);

        for (const filePath of filePaths) {
            try {
                // Use the filename (without .md) as the unique skill ID
                const skillId = path.basename(filePath, '.md');

                if (SkillRegistry.has(skillId)) {
                    const existing = SkillRegistry.get(skillId)!;
                    console.log(`    -> [PRECEDENCE OVERRIDE] Skipped /${tierDir}/${path.basename(filePath)} ('${skillId}' registered by higher-priority /${existing.sourceDir})`);
                    continue;
                }

                const content = fs.readFileSync(filePath, 'utf-8');

                SkillRegistry.set(skillId, {
                    id: skillId,
                    content: content,
                    sourceDir: tierDir
                });

                console.log(`    -> Registered Skill: [${skillId}] from /${tierDir}`);
            } catch (e: any) {
                console.error(`>>> [SKILL ENGINE ERROR] Failed to load ${filePath}: ${e.message}`);
            }
        }
    }

    console.log(`>>> [SKILL ENGINE] Boot complete. Registered ${SkillRegistry.size} unique skill(s).`);
}