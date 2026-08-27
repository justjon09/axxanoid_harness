import crypto from 'crypto';
import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../app/database.ts';
import { broadcastUpdate } from '../channels/web/ws-server.ts';
import { sendLlamaCompletion, ChatMessage } from '../engine/llama-client.ts';
import { formatPromptForModel, parseAgentAction, HarnessToolDefinition } from '../engine/translator.ts';
import { ToolRegistry, executeTool } from '../tools/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PAUSE_FILE = path.resolve(__dirname, '../.PAUSED');
const CONTROL_FILE = path.resolve(__dirname, '../configs/system_control.json');

// --- HELPER: Discover Tier 1 Agent dynamically ---
function getTier1AgentId(): string {
    const agentsDir = path.resolve(__dirname, '../agents');
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

// --- HELPER: Wildcard Permission Matcher ---
function isAllowed(name: string, allowedList: string[]): boolean {
    return allowedList.some(pattern => {
        if (pattern.endsWith('*')) {
            return name.startsWith(pattern.slice(0, -1));
        }
        return name === pattern;
    });
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
restRouter.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        const id = `task-${crypto.randomUUID().slice(0, 8)}`;
        
        // Find tier 1 agent
        const tier1Agent = getTier1AgentId();
        if (tier1Agent === 'unknown') {
            return res.status(400).json({ success: false, error: "No Tier 1 Agent found in configurations." });
        }

        broadcastUpdate('chat_msg', { sender: 'CEO', message: message });

        const agentDir = path.resolve(__dirname, `../../agents/${tier1Agent}`);
        const configPath = path.join(agentDir, 'config.json');
        const soulPath = path.join(agentDir, 'SOUL.md');

        let allowedToolsList: string[] = [];
        let agentSoul = '';
        let modelAlias = 'llama-3-groq-8b-tool-use';
        let promptFormat: 'llama3_groq' | 'qwen_coder' = 'llama3_groq';

        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            allowedToolsList = config.allowed_tools || [];
            if (config.assigned_model) {
                modelAlias = config.assigned_model;
                promptFormat = modelAlias.toLowerCase().includes('llama') ? 'llama3_groq' : 'qwen_coder';
            }
        }

        if (fs.existsSync(soulPath)) {
            agentSoul = fs.readFileSync(soulPath, 'utf-8');
        }

        const activeTools: HarnessToolDefinition[] = [];
        for (const [toolName, toolData] of ToolRegistry.entries()) {
            if (isAllowed(toolName, allowedToolsList)) {
                activeTools.push(toolData.schema);
            }
        }

        const systemInstruction = "You are the Chief of Staff interacting directly with the CEO. If the CEO gives a directive that requires system action, you MUST use the appropriate tool (like workboard_create) to delegate the work. If the CEO asks a question or makes a conversational statement, reply directly using natural language.";

        const conversationHistory: ChatMessage[] = [
            {
                role: 'system',
                content: `${agentSoul}\n\n${systemInstruction}`
            },
            {
                role: 'user',
                content: message
            }
        ];

        const formattedMessages = formatPromptForModel(conversationHistory, activeTools, promptFormat);
        const completion = await sendLlamaCompletion(formattedMessages, { model: modelAlias });
        const action = parseAgentAction(completion.content);

        if (action.type === 'user_message') {
            const replyContent = action.payload?.content || action.raw_response || completion.content;
            broadcastUpdate('chat_msg', { sender: tier1Agent.toUpperCase(), message: replyContent });
            return res.json({ success: true, message: 'Replied to chat' });
        }

        if (action.type === 'tool_call' && action.target) {
             if (!isAllowed(action.target, allowedToolsList)) {
                 broadcastUpdate('chat_msg', { sender: 'SYSTEM', message: `ERROR: ${tier1Agent.toUpperCase()} attempted to use unauthorized tool: ${action.target}` });
                 return res.status(403).json({ success: false, error: 'Unauthorized tool call' });
             }

             broadcastUpdate('telemetry_log', `[SYSTEM] ${tier1Agent.toUpperCase()} executing ${action.target}...`);
             const executionResult = await executeTool(action.target, action.payload);

             if (executionResult.success) {
                 broadcastUpdate('telemetry_log', `[SYSTEM] ${action.target} executed successfully.`);
                 broadcastUpdate('board_refresh', {});
                 broadcastUpdate('chat_msg', { sender: tier1Agent.toUpperCase(), message: `I have delegated the task to the workboard.` });
                 return res.json({ success: true, message: 'Tool executed successfully' });
             } else {
                 broadcastUpdate('telemetry_log', `[ERROR] ${action.target} failed: ${executionResult.error}`);
                 broadcastUpdate('chat_msg', { sender: tier1Agent.toUpperCase(), message: `I encountered an error trying to execute that command: ${executionResult.error}` });
                 return res.status(500).json({ success: false, error: executionResult.error });
             }
        }

        res.json({ success: true, id, message: 'Message processed' });
    } catch (err: any) {
        broadcastUpdate('telemetry_log', `[ERROR] Chat routing failed: ${err.message}`);
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
