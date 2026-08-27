import crypto from 'crypto';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../app/database.ts';
import { broadcastUpdate } from '../channels/web/ws-server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PAUSE_FILE = path.resolve(__dirname, '../../.PAUSED');
const CONTROL_FILE = path.resolve(__dirname, '../../configs/system_control.json');

// --- HELPER: Discover Tier 1 Agent dynamically ---
function getTier1AgentId(): string {
    const agentsDir = path.resolve(__dirname, '../../agents');
    if (!fs.existsSync(agentsDir)) return 'unknown';
    
    for (const folder of fs.readdirSync(agentsDir)) {
        const configPath = path.join(agentsDir, folder, 'config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            if (config.tier === 1) return config.agent_id;
        }
    }
    return 'unknown';
}

export const restRouter = Router();
// --- KANBAN ROUTES ---

// GET all Kanban cards
restRouter.get('/cards', (req, res) => {
    try {
        const cards = db.prepare(`SELECT * FROM workboard_cards ORDER BY updated_at DESC`).all();
        res.json({ success: true, data: cards });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST a new manual task from the UI
restRouter.post('/cards', (req, res) => {
    try {
        const { title, description, assignee } = req.body;
        const id = `task-${crypto.randomUUID().slice(0, 8)}`;
        
        // If no assignee is provided via the UI, default to the Tier 1 router dynamically
        const targetAssignee = assignee ? assignee.toLowerCase() : getTier1AgentId();

        db.prepare(`INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES (?, ?, ?, ?, 'ready')`)
          .run(id, title, description || 'Created via Web UI', targetAssignee);
          
        broadcastUpdate('board_refresh', { card_id: id });
        res.json({ success: true, id, message: 'Card added successfully' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// PUT to manually update card status via UI
restRouter.put('/cards/:id/status', (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const result = db.prepare(`UPDATE workboard_cards SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(status.toLowerCase(), id);
        
        if (result.changes === 0) {
            return res.status(404).json({ success: false, message: 'Card not found' });
        }

        broadcastUpdate('board_refresh', { card_id: id, status });
        res.json({ success: true, message: 'Card status updated' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- CHAT / COMMAND ROUTE ---
restRouter.post('/chat', (req, res) => {
    try {
        const { message } = req.body;
        const id = `task-${crypto.randomUUID().slice(0, 8)}`;
        
        // Find tier 1 agent
        const tier1Agent = getTier1AgentId();
        if (tier1Agent === 'unknown') {
             return res.status(400).json({ success: false, error: "No Tier 1 Agent found in configurations." });
        }
        
        db.prepare(`INSERT INTO workboard_cards (id, title, description, assignee, status) VALUES (?, ?, ?, ?, 'ready')`)
          .run(id, message, 'CEO Directive via Command Center', tier1Agent);
          
        broadcastUpdate('chat_msg', { sender: 'CEO', message: message });
        broadcastUpdate('telemetry_log', `[SYSTEM] CEO injected directive: ${id}`);
        broadcastUpdate('board_refresh', { card_id: id });
        
        res.json({ success: true, id, message: 'Command dispatched' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// --- SYSTEM CONTROLS ---
restRouter.get('/system/status', (req, res) => {
    const isPaused = fs.existsSync(PAUSE_FILE);
    let controls = { tools: {}, skills: {} };
    if (fs.existsSync(CONTROL_FILE)) {
        controls = JSON.parse(fs.readFileSync(CONTROL_FILE, 'utf-8'));
    }
    res.json({ success: true, paused: isPaused, controls });
});

restRouter.post('/system/pause', (req, res) => {
    fs.writeFileSync(PAUSE_FILE, 'paused');
    broadcastUpdate('system_status', { paused: true });
    broadcastUpdate('telemetry_log', `[SYSTEM] Orchestrator PAUSED by CEO.`);
    res.json({ success: true, paused: true });
});

restRouter.post('/system/resume', (req, res) => {
    if (fs.existsSync(PAUSE_FILE)) fs.unlinkSync(PAUSE_FILE);
    broadcastUpdate('system_status', { paused: false });
    broadcastUpdate('telemetry_log', `[SYSTEM] Orchestrator RESUMED by CEO.`);
    res.json({ success: true, paused: false });
});
