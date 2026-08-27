import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runHeartbeat } from './daemon-control.ts';
import { initWorkboardSchema } from './database.ts';
import { runOrchestratorPulse } from './orchestrator.ts';
import { restRouter } from '../api/router.ts';
import { initWebSocketServer } from '../channels/web/ws-server.ts';
import { initializeSkillEngine } from '../skills/index.ts';
import { initializeToolEngine } from '../tools/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8000;

// Critical: Allow the local UI to communicate with this backend
app.use(cors({
    origin: '*', // We will lock this down to localhost specifically in production
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: true
}));

app.use(express.json());

// Serve the static frontend dashboard
app.use(express.static(path.join(__dirname, '../channels/web/public')));

// Mount the API routes
app.use('/api', restRouter);

let heartbeatInterval: NodeJS.Timeout;
let orchestratorInterval: NodeJS.Timeout;

const startBackgroundLoops = () => {
    console.log(">>> [SYSTEM] Initializing background heartbeat (15m pulse)...");
    heartbeatInterval = setInterval(async () => {
        console.log("\n>>> [SYSTEM] Triggering 15-Minute Heartbeat...");
        await runHeartbeat();
    }, 900000);

    console.log(">>> [SYSTEM] Initializing Workboard Orchestrator (5s pulse)...");
    orchestratorInterval = setInterval(async () => {
        await runOrchestratorPulse();
    }, 5000);
};

// --- MASTER BOOT SEQUENCE ---
async function bootHarness() {
    try {
        // 1. Initialize SQLite Schema (Synchronous)
        initWorkboardSchema();

        // 2. Dynamically Load Tool Modules (Asynchronous)
        await initializeToolEngine();

        // 2b. Dynamically Load Skill Playbooks
        await initializeSkillEngine();

        // 3. Initialize the master application
        const server = app.listen(PORT, () => {
            console.log(`>>> Booting Axxanoid Harness ....`);
            console.log(`>>> API Listening on http://127.0.0.1:${PORT}`);
            // Initialize WebSockets
            initWebSocketServer(server);
            console.log(">>> [SYSTEM] Initializing startup heartbeat...");
            runHeartbeat();
            startBackgroundLoops();
        });

        // 4. Graceful Shutdown
        process.on('SIGINT', () => {
            console.log("\n>>> [SYSTEM] Shutting down daemon, Terminating heartbeat...");
            clearInterval(heartbeatInterval);
            clearInterval(orchestratorInterval);
            server.close(() => {
                process.exit(0);
            });
        });

    } catch (error) {
        console.error(">>> [FATAL BOOT ERROR] Failed to initialize Axxanoid Harness:", error);
        process.exit(1);
    }
}

// Ignite the engine
bootHarness();