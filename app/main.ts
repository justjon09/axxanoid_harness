import express from 'express';
import cors from 'cors';
import { runHeartbeat } from './daemon-control.ts';
import { initWorkboardSchema } from './database.ts';

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

const startHeartbeatLoop = () => {
    console.log(">>> [SYSTEM] Initializing background heartbeat...");

    // Wait 15 minutes (900,000 ms) between pulses
    heartbeatInterval = setInterval(async () => {
        console.log("\n>>> [SYSTEM] Triggering 15-Minute Heartbeat...");
        await runHeartbeat();
    }, 900000)
};

// Initialize schema on startup
initWorkboardSchema();

// Initialize the master application
const server = app.listen(PORT, () => {
    console.log(`>>> Booting Axxanoid Harness ....`);
    console.log(`>>> API Listening on http://127.0.0.1:${PORT}`);
    console.log(">>> [SYSTEM] Initializing startup heartbeat...");
    runHeartbeat();
    startHeartbeatLoop();
});

// Graceful Shutdown (Equivalent to FastAPI's 'finally' block in lifespan)
process.on('SIGINT', () => {
    console.log("\n>>> [SYSTEM] Shutting down daemon, Terminating heartbeat...");
    clearInterval(heartbeatInterval);
    server.close(() => {
        process.exit(0);
    });
});