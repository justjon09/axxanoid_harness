export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    name?: string;
}

export interface CompletionOptions {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    response_format?: {
        type: 'text' | 'json_object'| 'json_schema';
        schema?: object;
        json_schema?: object;
    };
}

export interface LlamaChoice {
    index: number;
    message: ChatMessage;
    finish_reason: string;
}

export interface LlamaCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: LlamaChoice[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

const ENGINE_URL = process.env.LLAMA_ENGINE_URL || 'http://127.0.0.1:8080';

/**
 * Checks if the local llama-server instance is responsive.
 */
export async function checkEngineHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${ENGINE_URL}/health`, { method: 'GET' });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Sends a chat completion request to the local llama-server instance.
 */
export async function sendLlamaCompletion(
    messages: ChatMessage[],
    options: CompletionOptions = {}
): Promise<ChatMessage> {
    const payload = {
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 2048,
        top_p: options.top_p ?? 0.9,
        stream: false,
        ...(options.model ? { model: options.model } : {}),
        ...(options.response_format ? { response_format: options.response_format } : {})
    };

    try {
        const response = await fetch(`${ENGINE_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`llama-server returned HTTP ${response.status}: ${errorText}`);
        }

        const data = (await response.json()) as LlamaCompletionResponse;

        if (!data.choices || data.choices.length === 0) {
            throw new Error('llama-server returned response with no completion choices.');
        }

        return data.choices[0].message;
    } catch (error: any) {
        console.error(`>>> [ENGINE CLIENT ERROR] Failed to communicate with llama-server: ${error.message}`);
        throw error;
    }
}