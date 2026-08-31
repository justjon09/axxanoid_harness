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
       // Map our Harness tools to OpenAI style for the Groq prompt
        const groqTools = tools.map(t => ({
            name: t.name,
            description: t.description,
            parameters: {
                type: "object",
                properties: t.parameters,
                required: Object.keys(t.parameters).filter(k => t.parameters[k].required)
            }
        }));

        const toolSystemPrompt = 
            `You are a function calling AI model. You are provided with function signatures within XML tags. You may call one or more functions to assist with the user query. Don't make assumptions about what values to plug into functions.\n\n` +
            `For each function call return a json object with function name and arguments within XML tags as follows:\n` +
            `<tool_call>\n{"name": "<function-name>", "arguments": <args-dict>}\n</tool_call>\n\n` +
            `Here are the available tools:\n<tools>\n` +
            JSON.stringify(groqTools, null, 2) +
            `\n</tools>`;

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
 * Response Interceptor: Parses raw model text into structured AgentAction payloads.
 */
export function parseAgentAction(rawCompletion: string): AgentAction {
    const trimmed = rawCompletion.trim();
    
    // Catch Groq <tool_call> XML format
    const toolCallRegex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/i;
    const toolMatch = toolCallRegex.exec(trimmed);
    if (toolMatch && toolMatch[1]) {
        try {
            const parsed = JSON.parse(toolMatch[1].trim());
            if (parsed.name && parsed.arguments) {
                return {
                    type: 'tool_call',
                    target: parsed.name,
                    payload: parsed.arguments,
                    raw_response: rawCompletion
                };
            }
        } catch {
            // Fall through
        }
    }

    // Direct JSON Parse Attempt
    try {
        const parsed = JSON.parse(trimmed);
        // Standard format
        if (parsed.type && parsed.payload) {
            return {
                type: parsed.type,
                target: parsed.target,
                payload: parsed.payload,
                raw_response: rawCompletion
            };
        }
        // Groq native format
        if (parsed.name && (parsed.parameters || parsed.arguments)) {
            return {
                type: 'tool_call',
                target: parsed.name,
                payload: parsed.parameters || parsed.arguments,
                raw_response: rawCompletion
            };
        }
        //  Catch hybrid format
        if (parsed.type && parsed.parameters) {
            return { 
                type: 'tool_call', 
                target: parsed.type, // Treats "rag_search" as the target tool
                payload: parsed.parameters, 
                raw_response: rawCompletion 
            };
        }
    } catch {
        // Fall through
    }

    // Catch Parallel Groq Format (e.g. `{"id": 0...} {"id": 1...}`)
    try {
        const groqFormat = `[${trimmed.replace(/}\s*\{/g, '}, {')}]`;
        const parsedArray = JSON.parse(groqFormat);
        if (Array.isArray(parsedArray) && parsedArray.length > 0) {
            // Prioritize workboard_create if the model tried to do multiple things, otherwise grab the first tool
            const targetTool = parsedArray.find(t => t.name === 'workboard_create') || parsedArray[0];
            if (targetTool.name && (targetTool.parameters || targetTool.arguments)) {
                return { 
                    type: 'tool_call', 
                    target: targetTool.name, 
                    payload: targetTool.parameters || targetTool.arguments, 
                    raw_response: rawCompletion 
                };
            }
        }
    } catch {
         // Fall through
    }

    // Markdown Code Block Regex Extraction
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
            
            if (parsed.name && parsed.parameters) {
                return {
                    type: 'tool_call',
                    target: parsed.name,
                    payload: parsed.parameters,
                    raw_response: rawCompletion
                };
            }
        } catch {
            // Fall through
        }
    }

    // JSON Regex (No markdown, mixed with prose)
    const nakedJsonMatch = trimmed.match(/\{[\s\S]*"name"\s*:\s*"[^"]+"[\s\S]*"parameters"\s*:[\s\S]*\}/);
    if (nakedJsonMatch) {
        try {
            const parsed = JSON.parse(nakedJsonMatch[0]);
            if (parsed.name && parsed.parameters) {
                return { type: 'tool_call', target: parsed.name, payload: parsed.parameters, raw_response: rawCompletion };
            }
        } catch {
            // Fall through
        }
    }

    // Unstructured Fallback
    return {
        type: 'user_message',
        payload: { content: rawCompletion },
        raw_response: rawCompletion
    };
}