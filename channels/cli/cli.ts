import {
    addTask,
    agentCreate,
    getLogs,
    getStatus,
    incorpTool,
    memoryRebuild,
    systemSwitch,
    workboardResume
} from './assets/commands/index.ts';

const args = process.argv.slice(2);
const command = args[0];

if (!command) {
    console.log(`
Axxanoid OS - CEO CLI
---------------------
Kanban Controls:
  add "Task"                - Inject a new top-level task for the Chief of Staff
  status                    - View the current Kanban board state
  logs [agent]              - View the latest execution payloads

System Controls:
  pause                     - Halt the Orchestrator loop
  resume                    - Resume the Orchestrator loop
  toggle <tool|skill> <name> <on|off> - Enable or disable a tool/skill globally
  agent create <name> <tier>          - Scaffold a new agent directory
  tool incorp <name>                  - Scaffold an open-source tool wrapper
    `);
    process.exit(0);
}

switch (command) {
    case 'add': {
        addTask(args);
        break;
    }
    case 'status': {
        getStatus();
        break;
    }
    case 'pause': {
        workboardPause();
        break;
    }
    case 'resume': {
        workboardResume();
        break;
    }
    case 'logs': {
        getLogs(args);
        break;
    }
    case 'toggle': {
        systemSwitch(args);
        break;
    }
    case 'agent': {
        agentCreate(args);
        break;
    }
    case 'tool': {
        const subCommand = args[1];
        if (subCommand === 'incorp') {
            incorpTool(args);
        } else {
            console.log(">>> [CLI] Unknown tool subcommand. Did you mean: axx tool incorp <name>?");
            process.exit(1);
        }
        break;
    }
    case 'memory': {
        const subCommand = args[1];
        if (subCommand === 'rebuild') {
            memoryRebuild(args);
        } else {
            console.log(">>> [CLI] Usage: axx memory rebuild <souls|knowledge|archive>");
            process.exit(1);
        }
        break;
    } 
    default:
        console.log(`>>> [CLI] Unknown command: ${command}`);
}