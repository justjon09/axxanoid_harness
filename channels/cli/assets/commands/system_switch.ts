import fs from 'fs';
import path from 'path';
import { __dirname } from './index.ts';

export function systemSwitch (args: string[]) {
    const targetType = args[1]; // 'tool' or 'skill'
    const targetName = args[2];
    const stateStr = args[3];

        if (!targetType || !targetName || !stateStr) {
            console.log(">>> [CLI] Usage: axx toggle <tool|skill> <name> <on|off>");
            process.exit(1);
        }

        const controlPath = path.resolve(__dirname, '../../../../configs/system_control.json');
        if (!fs.existsSync(controlPath)) {
            console.error(">>> [CLI] Error: system_control.json not found.");
            process.exit(1);
        }

        const config = JSON.parse(fs.readFileSync(controlPath, 'utf-8'));
        const typeKey = targetType === 'tool' ? 'tools' : 'skills';
        
        if (!config[typeKey]) config[typeKey] = {};
        
        const isEnabled = stateStr.toLowerCase() === 'on' || stateStr.toLowerCase() === 'true';
        config[typeKey][targetName] = isEnabled;

        fs.writeFileSync(controlPath, JSON.stringify(config, null, 2));
        console.log(`>>> [CLI] Success: Toggled ${targetType} [${targetName}] to ${isEnabled ? 'ON' : 'OFF'}. Restart daemon to apply.`);
};