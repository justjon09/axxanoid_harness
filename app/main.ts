import express from 'express';
import cors from 'cors';
import { runHeartbeat } from './daemon-control.ts';

const app = express();
const PORT = process.env.PORT || 8000;

// Critical: Allow the local React UI to communicate with this backend
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
    res.json({ message: "Axxanoid Harnes is available" });
});

let heartbeatInterval: NodeJS.Timeout;

const startHeartbeatLoop = () => {
    console.log(">>> [SYSTEM] Initializing background heartbeat...");
    // Wait 15 minutes (900,000 ms) between pulses
    heartbeatInterval = setInterval(async () => {
        console.log("\n>>> [SYSTEM] Triggering 15-Minute Heartbeat...");
        await runHeartbeat();
    }, 900000);
};

// Initialize the master application
const server = app.listen(PORT, () => {
    console.log(`>>> Booting Axxanoid Harness ....`);
    console.log(`>>> API Listening on http://127.0.0.1:${PORT}`);
    startHeartbeatLoop();
});

// Graceful Shutdown (Equivalent to FastAPI's 'finally' block in lifespan)
process.on('SIGINT', () => {
    console.log("\n>>> [SYSTEM] Stoping Axxaniod Harnes, Terminating heartbeat...");
    clearInterval(heartbeatInterval);
    server.close(() => {
        process.exit(0);
    });
});