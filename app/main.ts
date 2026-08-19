import express from 'express';
import cors from 'cors';
import { runHeartbeat } from './daemon-control.ts';
import { initWorkboardSchema } from './database.ts';
import { runOrchestratorPulse } from './orchestrator.ts';

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

// Mount the API routes (We will port rest_router later)
// app.use('/api', restRouter);

app.get('/', (req, res) => {
    res.json({ message: "Axxanoid OS Daemon available" });
});

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

// Initialize schema on startup
initWorkboardSchema();

// Initialize the master application
const server = app.listen(PORT, () => {
    console.log(`>>> Booting Axxanoid Harness ....`);
    console.log(`>>> API Listening on http://127.0.0.1:${PORT}`);
    console.log(">>> [SYSTEM] Initializing startup heartbeat...");
    runHeartbeat();
    startBackgroundLoops();
});

// Graceful Shutdown (Equivalent to FastAPI's 'finally' block in lifespan)
process.on('SIGINT', () => {
    console.log("\n>>> [SYSTEM] Shutting down daemon, Terminating heartbeat...");
    clearInterval(heartbeatInterval);
    clearInterval(orchestratorInterval);
    server.close(() => {
        process.exit(0);
    });
});