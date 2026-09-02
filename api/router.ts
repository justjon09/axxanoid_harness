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

// GET chat history for UI refresh
restRouter.get('/chat', (req, res) => {
    try {
        const history = db.prepare(`SELECT role, content FROM chat_history ORDER BY id ASC`).all();
        res.json({ success: true, data: history });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

restRouter.post('/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        // Find tier 1 agent
        const tier1Agent = getTier1AgentId();
        if (tier1Agent === 'unknown') {
            return res.status(400).json({ success: false, error: "No Tier 1 Agent found in configurations." });
        }

        // Save the user's message to the DB
        db.prepare(`INSERT INTO chat_history (role, content) VALUES ('user', ?)`).run(message);
        broadcastUpdate('chat_msg', { sender: 'CEO', message: message });

        const agentDir = path.resolve(__dirname, `../agents/${tier1Agent}`);
        const configPath = path.join(agentDir, 'config.json');
        const soulPath = path.join(agentDir, 'SOUL.md');
        const identityPath = path.join(agentDir, 'IDENTITY.md');

        let allowedToolsList: string[] = [];
        let agentSoul = '';
        let agentIdentity = '';
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

        if (fs.existsSync(identityPath)) {
            agentIdentity = fs.readFileSync(identityPath, 'utf-8');
        }

        const activeTools: HarnessToolDefinition[] = [];
        for (const [toolName, toolData] of ToolRegistry.entries()) {
            if (isAllowed(toolName, allowedToolsList)) {
                activeTools.push(toolData.schema);
            }
        }

        // const systemInstruction = "You have full authorization to execute the provided tools. Output the required JSON tool_call to perform system actions.";
        const systemInstruction = "";

        // Fetch the last 15 messages for context
        const pastMessagesRaw = db.prepare(`
            SELECT role, content FROM (
                SELECT id, role, content FROM chat_history ORDER BY id DESC LIMIT 15
            ) ORDER BY id ASC
        `).all() as { role: string, content: string }[];

        // Map system notifications to user role so the LLM doesn't adopt them as its own voice
        const pastMessages: ChatMessage[] = pastMessagesRaw.map(msg => {
            if (msg.role === 'system') {
                return { role: 'user', content: `[SYSTEM WORKBOARD UPDATE]: ${msg.content}` };
            }
            return { role: msg.role as 'user' | 'assistant', content: msg.content };
        });

        const conversationHistory: ChatMessage[] = [
            {
                role: 'system',
                content: `${agentIdentity}\n\n${agentSoul}\n\n${systemInstruction}`
            },
            ...pastMessages
        ];

        const formattedMessages = formatPromptForModel(conversationHistory, activeTools, promptFormat);

        const maxDuplicates = 3; // Kill if stuck executing the EXACT same tool call 3x in a row
        const hardCap = 15; // Absolute safety ceiling
        let finalReply = '';
        let roleToSave = 'assistant';
        let totalSteps = 0;        
        let consecutiveDuplicates = 0;        
        let lastActionSignature = '';
        let requestResolved = false;

        // The structural envelope
        const grammarSchema = {
            type: "object",
            properties: {
                type: { type: "string", enum: ["tool_call", "user_message"] },
                target: { type: "string", description: "The exact name of the tool being called, or 'chat' if type is user_message." },
                payload: { type: "object", description: "The arguments for the tool, or { 'content': 'message' } if user_message." }
            },
            required: ["type", "target", "payload"]
        };

        while (totalSteps < hardCap && !requestResolved) {
            totalSteps++;

            console.log(`\n=== DEBUG [STEP ${totalSteps}]: INBOUND PROMPT ===`);
            console.log(JSON.stringify(formattedMessages[formattedMessages.length - 1], null, 2));


            // Dispatch with the hardware-level JSON lock
            const completion = await sendLlamaCompletion(formattedMessages, { 
                model: modelAlias,
                response_format: {
                    type: "json_object",
                    schema: grammarSchema
                }
            });

            console.log(`\n=== DEBUG [STEP ${totalSteps}]: RAW LLM OUTPUT ===`);
            console.log(completion.content);

            // Because of the engine lock, JSON.parse is guaranteed to work
            let action;
            try {
                action = JSON.parse(completion.content || "{}");
            } catch (e) {
                // Fallback ONLY if the engine somehow violates its own GBNF grammar
                action = { type: 'user_message', payload: { content: completion.content } };
            }

            if (action.type === 'user_message') {
                const candidateContent = action.payload?.content || action.raw_response || completion.content;
                
                if (candidateContent.includes('{"name":') || candidateContent.includes('{"type":') || candidateContent.includes('```json')) {
                    // DO NOT FAIL SILENTLY: Broadcast the exact error to the CEO's dashboard
                    const errMsg = `[PARSER ERROR] Agent hallucinated bad syntax. Forcing self-correction...`;
                    console.warn(`>>> ${errMsg}`);
                    broadcastUpdate('telemetry_log', errMsg);
                   
                    // Let the agent learn in the short-term by feeding its mistake back to it
                    formattedMessages.push({ role: 'assistant', content: completion.content });
                    formattedMessages.push({ role: 'user', content: '[SYSTEM ERROR] You output malformed JSON or raw tool-call syntax. You must use the exact required JSON schema or reply with clean conversational text.' });
                } else {
                    // It is a genuine, clean text response to the CEO. Exit loop and save.
                    finalReply = candidateContent;
                    roleToSave = 'assistant';
                    requestResolved = true;
                }
                // The LLM wants to use a tool
            } else if (action.type === 'tool_call' && action.target) {
                // Generate a unique fingerprint of this tool call
                const currentSignature = `${action.target}:${JSON.stringify(action.payload)}`;

                // LOOP DETECTOR: Check if the model is repeating itself
                if (currentSignature === lastActionSignature) {
                    consecutiveDuplicates++;
                    console.warn(`>>> [LOOP DETECTED] Duplicate tool call attempt ${consecutiveDuplicates}/${maxDuplicates}: ${action.target}`);
                    console.warn(`    Payload: ${JSON.stringify(action.payload)}`);
                    
                    if (consecutiveDuplicates >= maxDuplicates) {
                        broadcastUpdate('telemetry_log', `[SYSTEM BLOCK] Agent stuck in an identical tool loop (${action.target}). Terminating task.`);
                        finalReply = `[SYSTEM DIAGNOSTIC] Execution halted: Stuck in an identical loop calling '${action.target}'.`;
                        requestResolved = true;
                        break;
                    }
                } else {
                    // PROGRESS MADE: Reset duplicate counter on unique actions
                    consecutiveDuplicates = 0;
                    lastActionSignature = currentSignature;
                }

                if (!isAllowed(action.target, allowedToolsList)) {
                    broadcastUpdate('telemetry_log', `[SYSTEM BLOCK] Unauthorized tool attempt: ${action.target}`);
                    formattedMessages.push({ role: 'assistant', content: completion.content });
                    formattedMessages.push({ role: 'user', content: `[SYSTEM ERROR] You do not have permission to use the tool '${action.target}'.` });
                } else {
                    broadcastUpdate('telemetry_log', `[SYSTEM] ${tier1Agent.toUpperCase()} executing ${action.target}...`);
                    const executionResult = await executeTool(action.target, action.payload);

                    // Push the LLM's tool call into the context
                    formattedMessages.push({ role: 'assistant', content: completion.content });
                    if (executionResult.success) {
                        console.log(`\n=== DEBUG [STEP ${totalSteps}]: TOOL RETURN DATA ===`);
                        console.log(executionResult.output);

                        broadcastUpdate('telemetry_log', `[SYSTEM] ${action.target} executed successfully.`);
                        broadcastUpdate('board_refresh', {});

                        // Feed the tool result back into the context so the LLM can read it
                        formattedMessages.push({ 
                            role: 'tool', 
                            name: action.target,
                            content: executionResult.output
                        });
                    } else {
                        broadcastUpdate('telemetry_log', `[ERROR] ${action.target} failed: ${executionResult.error}`);
                        // Feed the error back so the LLM can self-heal or tell the user it failed
                        formattedMessages.push({ 
                            role: 'tool', 
                            name: action.target,
                            content: `{"error": "${executionResult.error}"}` 
                        });
                    }
                }
            } else {
                // Fallback for unparseable output
                finalReply = completion.content;
                roleToSave = 'assistant';
                requestResolved = true;
            }
        }

        // Safety catch if the LLM loops too many times
        if (!requestResolved) {
            // 3. Permanent DB Learning: The agent failed. Record a clean failure in the DB.
            finalReply = "[SYSTEM DIAGNOSTIC] I reached my maximum processing limit and failed to format the tool call correctly. I need the CEO to clarify or reset the task.";
            roleToSave = 'assistant'; // Save as assistant so it owns the failure cleanly
        }

        // Save Agent's final reply to DB and broadcast
        if (finalReply) {
            db.prepare(`INSERT INTO chat_history (role, content) VALUES (?, ?)`).run(roleToSave, finalReply);
            broadcastUpdate('chat_msg', { 
                sender: roleToSave === 'system' ? 'SYSTEM' : tier1Agent.toUpperCase(), 
                message: finalReply 
            });
        }

        res.json({ success: true, message: 'Message processed' });
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
