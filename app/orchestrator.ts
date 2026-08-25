import { db } from './database.ts';
import { sendLlamaCompletion, ChatMessage } from '../engine/llama-client.ts';
import { formatPromptForModel, parseAgentAction, HarnessToolDefinition } from '../engine/translator.ts';
import { SYSTEM_TOOLS } from '../tools/native.ts'
import { executeTool, ToolResult } from '../tools/executor.ts';

export interface WorkboardCard {
    id: string;
    title: string;
    description: string | null;
    assignee: string; // 'noid' | 'execubot' | 'dobot' | 'pubbot' | 'axxbot'
    status: 'ready' | 'in_progress' | 'blocked' | 'done' | 'failed';
    parent_id: string | null;
    result_payload: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Sweeps the database for blocked tasks whose dependencies are all complete,
 * automatically promoting them to 'ready' (The Domino Effect).
 */
export async function resolveDependencies() {
    // Find all 'blocked' cards
    const blockedCards = db.prepare(`
        SELECT * FROM workboard_cards WHERE status = 'blocked'
    `).all() as WorkboardCard[];

    for (const card of blockedCards) {
        // Check if there are any incomplete dependencies for this card
        const unresolvedDep = db.prepare(`
            SELECT cd.depends_on_id 
            FROM card_dependencies cd
            JOIN workboard_cards wc ON cd.depends_on_id = wc.id
            WHERE cd.card_id = ? AND wc.status != 'done'
            LIMIT 1
        `).get(card.id);

        // If no incomplete dependencies remain, unblock the card
        if (!unresolvedDep) {
            db.prepare(`
                UPDATE workboard_cards 
                SET status = 'ready', updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            `).run(card.id);
            console.log(`>>> [ORCHESTRATOR] Unblocked card "${card.title}" (${card.id}) -> Promoted to READY`);
        }
    }
}

/**
 * Fetches the next available 'ready' cards assigned to worker agents.
 */
export function getReadyTasks(): WorkboardCard[] {
    return db.prepare(`
        SELECT * FROM workboard_cards 
        WHERE status = 'ready' 
        ORDER BY created_at ASC
    `).all() as WorkboardCard[];
}

/**
 * Moves task to 'in_prgress', envokes model, ingest result and update tak accordingly. 
 */
export async function processTask(task: WorkboardCard) {
    // 1. Mark task in_progress
    db.prepare(`
        UPDATE workboard_cards 
        SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `).run(task.id);

    console.log(`>>> [ORCHESTRATOR] Processing Task [${task.id}] with Assignee [${task.assignee.toUpperCase()}]`);

    const isWorker = ['noid', 'execubot', 'dobot'].includes(task.assignee.toLowerCase());
    // 1. Select model based on agent tier        
    // Map assignee to exact model alias registered in models.ini
    const modelAlias = task.assignee === 'axxbot' 
        ? 'llama-3-groq-8b-tool-use' 
        : 'qwen2.5-coder-14b-instruct';

    // Map assignee to internal translator prompt formatter
    const promptFormat = task.assignee === 'axxbot' 
        ? 'llama3_groq' 
        : 'qwen_coder';
    
    const conversationHistory: ChatMessage[] = [
        {
            role: 'system',
            content: `You are ${task.assignee.toUpperCase()}, an execution worker in Axxanoid OS. You MUST issue an actionable JSON tool_call to perform work. Do NOT respond with plain conversational prose or explanations.`
        },
        {
            role: 'user',
            content: `Task: ${task.title}\nDetails: ${task.description || 'None'}`
        }
    ];

    let attempts = 0;
    const maxAttempts = 3;
    let taskCompleted = false;
    let lastResultPayload: any = null;

    while (attempts < maxAttempts && !taskCompleted) {
        attempts++;
        console.log(`>>> [ORCHESTRATOR] Task [${task.id}] Execution Attempt ${attempts}/${maxAttempts}`);

        try {
            // Format message include SYSTEM_TOOLS
            const formattedMessages = formatPromptForModel(conversationHistory, SYSTEM_TOOLS, promptFormat);
            // Dispatch to Local Engine
            const completion = await sendLlamaCompletion(formattedMessages, { model: modelAlias });
            // 3. Intercept & Parse Action
            const action = parseAgentAction(completion.content);

            // PROSE REJECTION: Worker agents MUST invoke tools, not chat
            if (isWorker && action.type === 'user_message') {
                console.warn(`>>> [PROSE REJECTED] Worker [${task.assignee.toUpperCase()}] returned prose instead of a tool call.`);
                
                conversationHistory.push({
                    role: 'assistant',
                    content: completion.content
                });
                conversationHistory.push({
                    role: 'user',
                    content: 'ERROR: Conversational responses are rejected. You must output a JSON tool_call payload (e.g. write_file or run_terminal) to perform physical work on the OS.'
                });

                lastResultPayload = {
                    error: 'Rejected: Worker returned conversational text instead of an actionable tool call.',
                    response: completion.content
                };
                continue;
            }

            // OS TOOL EXECUTION GATE
            if (action.type === 'tool_call' && action.target) {
                console.log(`>>> [EXECUTION] Intercepted Tool [${action.target}]. Executing on OS...`);
                const executionResult: ToolResult = await executeTool(action.target, action.payload);

                lastResultPayload = {
                    action,
                    execution: executionResult
                };

                if (executionResult.success) {
                    console.log(`>>> [EXECUTION VERIFIED SUCCESS]: ${executionResult.output}`);
                    taskCompleted = true;
                } else {
                    console.warn(`>>> [EXECUTION FAILED]: ${executionResult.error}`);
                    
                    // SELF-HEALING FEEDBACK: Push error back to LLM context
                    conversationHistory.push({
                        role: 'assistant',
                        content: completion.content
                    });
                    conversationHistory.push({
                        role: 'user',
                        content: `TOOL EXECUTION ERROR (${action.target}): ${executionResult.error}\nFix the issue in your parameters/code and re-issue the tool_call.`
                    });
                }
            } else {
                taskCompleted = true;
                lastResultPayload = { action };
            }
        } catch (error: any) {
            console.error(`>>> [INFERENCE ERROR] Attempt ${attempts} failed: ${error.message}`);
            lastResultPayload = { error: error.message };
        }
    }

    // 4. Update task
    const finalStatus = taskCompleted ? 'done' : 'failed';
    db.prepare(
        `
        UPDATE workboard_cards 
        SET status = ?, result_payload = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
        `
    ).run(finalStatus, JSON.stringify(lastResultPayload, null, 2), task.id);

    console.log(`>>> [ORCHESTRATOR] Task [${task.id}] Finalized -> STATUS: ${finalStatus.toUpperCase()}`);
}

/**
 * Main orchestrator pulse function.
 */
export async function runOrchestratorPulse() {
    try {
        // Step 1: Auto-unblock child cards whose parent dependencies completed
        await resolveDependencies();

        // Step 2: Fetch unblocked tasks ready for execution
        const readyTasks = getReadyTasks();

        if (readyTasks.length > 0) {
            console.log(`>>> [ORCHESTRATOR] Found ${readyTasks.length} READY task(s) on Workboard.`);
            for (const task of readyTasks) {
                console.log(`    -> [CARD ${task.id}] Assigned to: ${task.assignee.toUpperCase()} | Title: "${task.title}"`);
                // Execution dispatch
                await processTask(task);
            }
        }
    } catch (error: any) {
        console.error(`>>> [ORCHESTRATOR ERROR] ${error.message}`);
    }
}