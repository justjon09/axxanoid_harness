import { normalizeToolSchema, parseAgentAction, formatPromptForModel } from '../../engine/translator.ts';

// Test 1: OpenAI Tool Schema Normalization
const openAISchema = {
    type: "function",
    function: {
        name: "execute_terminal",
        description: "Run terminal command in sandbox",
        parameters: {
            type: "object",
            properties: { command: { type: "string", description: "Bash command" } },
            required: ["command"]
        }
    }
};
console.log("Normalized Tool:", normalizeToolSchema(openAISchema));

// Test 2: Parsing Markdown JSON Completion
const rawMarkdownCompletion = "Here is my response:\n```json\n{\n  \"type\": \"tool_call\",\n  \"target\": \"execute_terminal\",\n  \"payload\": { \"command\": \"ls -la\" }\n}\n```";
console.log("Parsed Markdown Action:", parseAgentAction(rawMarkdownCompletion));

// Test 3: Unstructured Fallback
console.log("Parsed Plain Text Action:", parseAgentAction("Task completed successfully without tools."));

// npx tsx scripts/harnes-test/translator.ts