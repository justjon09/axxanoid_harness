import { ChatMessage } from './llama-client.ts';

export type ExecutionType = 'tool' | 'skill';

export interface HarnessParameter {
    type: string;
    description: string;
    required?: boolean;
    default?: any;
}

export interface HarnessToolDefinition {
    name: string;
    description: string;
    type: ExecutionType;
    parameters: Record<string, HarnessParameter>;
    handler_type: 'typescript' | 'python_sandbox' | 'mcp' | 'cli';
}

export interface AgentAction {
    type: 'tool_call' | 'workboard_mutation' | 'subagent_delegation' | 'user_message';
    target?: string;
    payload: Record<string, any>;
    raw_response?: string;
}

/**
 * Universal Adapter: Normalizes OpenAI, MCP, or custom open-source tool definitions
 * into the unified HarnessToolDefinition structure.
 */
export function normalizeToolSchema(externalSchema: any): HarnessToolDefinition {
    // Adapter for OpenAI Function Calling format
    if (externalSchema.type === 'function' && externalSchema.function) {
        const fn = externalSchema.function;
        const properties = fn.parameters?.properties || {};
        const required = fn.parameters?.required || [];
        
        const params: Record<string, HarnessParameter> = {};
        for (const [key, val] of Object.entries<any>(properties)) {
            params[key] = {
                type: val.type || 'string',
                description: val.description || '',
                required: required.includes(key)
            };
        }

        return {
            name: fn.name,
            description: fn.description || '',
            type: 'tool',
            parameters: params,
            handler_type: 'typescript'
        };
    }

    // Native & Custom Skill Spec Fallback
    return {
        name: externalSchema.name || 'unknown_capability',
        description: externalSchema.description || '',
        type: externalSchema.type || 'tool',
        parameters: externalSchema.parameters || {},
        handler_type: externalSchema.handler_type || 'python_sandbox'
    };
}

/**
 * Outbound Prompt Compiler: Injects universal tools into model-specific system prompts.
 */
export function formatPromptForModel(
    messages: ChatMessage[],
    tools: HarnessToolDefinition[],
    modelType: 'llama3_groq' | 'qwen_coder'
): ChatMessage[] {
    const formattedMessages = [...messages];
    if (tools.length === 0) return formattedMessages;

    if (modelType === 'llama3_groq') {
        const toolSystemPrompt = 
            `[AVAILABLE_TOOLS]\n` +
            JSON.stringify(tools, null, 2) +
            `\n[/AVAILABLE_TOOLS]\n\n` +
            `To trigger a tool, output ONLY a valid JSON object:\n` +
            `{"type": "tool_call", "target": "<tool_name>", "payload": {<arguments>}}`;

        if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
            formattedMessages[0].content += `\n\n${toolSystemPrompt}`;
        } else {
            formattedMessages.unshift({ role: 'system', content: toolSystemPrompt });
        }
    } else if (modelType === 'qwen_coder') {
        const toolSystemPrompt = 
            `# Execution Tools & Skills\n` +
            JSON.stringify(tools, null, 2) +
            `\n\nWhen executing, output your action strictly inside a markdown JSON block:\n` +
            `\`\`\`json\n{"type": "tool_call", "target": "<tool_name>", "payload": {<arguments>}}\n\`\`\``;

        if (formattedMessages.length > 0 && formattedMessages[0].role === 'system') {
            formattedMessages[0].content += `\n\n${toolSystemPrompt}`;
        } else {
            formattedMessages.unshift({ role: 'system', content: toolSystemPrompt });
        }
    }

    return formattedMessages;
}

/**
 * Response Interceptor: Parses raw model text (strict JSON, markdown fences, or prose)
 * into structured AgentAction payloads.
 */
export function parseAgentAction(rawCompletion: string): AgentAction {
    const trimmed = rawCompletion.trim();

    // 1. Direct JSON Parse Attempt
    try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type && parsed.payload) {
            return {
                type: parsed.type,
                target: parsed.target,
                payload: parsed.payload,
                raw_response: rawCompletion
            };
        }
    } catch {
        // Fall through
    }

    // 2. Markdown Code Block Regex Extraction (```json ... ```)
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = jsonBlockRegex.exec(trimmed);
    if (match && match[1]) {
        try {
            const parsed = JSON.parse(match[1].trim());
            if (parsed.type && parsed.payload) {
                return {
                    type: parsed.type,
                    target: parsed.target,
                    payload: parsed.payload,
                    raw_response: rawCompletion
                };
            }
        } catch {
            // Fall through
        }
    }

    // 3. Unstructured Fallback
    return {
        type: 'user_message',
        payload: { content: rawCompletion },
        raw_response: rawCompletion
    };
}