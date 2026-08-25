import { HarnessToolDefinition } from "../engine/translator";

export const SYSTEM_TOOLS: HarnessToolDefinition[] = [
    {
        name: 'write_file',
        description: 'Write or overwrite a physical file on the disk.',
        type: 'tool',
        parameters: {
            path: { type: 'string', description: 'Relative path where file should be saved (e.g. ./scripts/hello.py)', required: true },
            content: { type: 'string', description: 'Exact raw file contents to write', required: true }
        },
        handler_type: 'typescript'
    },
    {
        name: 'read_file',
        description: 'Read the text content of a file from disk.',
        type: 'tool',
        parameters: {
            path: { type: 'string', description: 'Relative path of the file to read', required: true }
        },
        handler_type: 'typescript'
    },
    {
        name: 'list_files',
        description: 'List all files and folders in a given directory.',
        type: 'tool',
        parameters: {
            path: { type: 'string', description: 'Directory path to inspect (defaults to .)', required: false }
        },
        handler_type: 'typescript'
    },
    {
        name: 'run_terminal',
        description: 'Execute a terminal command or Python script in the axx_env sandbox.',
        type: 'tool',
        parameters: {
            command: { type: 'string', description: 'Shell command to execute', required: true }
        },
        handler_type: 'cli'
    }
];