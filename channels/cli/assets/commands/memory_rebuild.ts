import fs from 'fs';
import path from 'path';
import { db, runBridge } from './index.ts';

export async function memoryRebuild (args: string[]) {
    const target = args[2];    
    if (!['souls', 'knowledge', 'archive'].includes(target)) {
        console.log(">>> [CLI] Usage: axx memory rebuild <souls|knowledge|archive>");
        process.exit(1);
    }

    if (target === 'souls') {
        console.log(">>> [CLI] Rebuilding 'souls' vector collection...");
        runBridge('reset', { collection: 'souls' });
        
        const agentsDir = path.resolve(__dirname, '../../../../agents');
        if (fs.existsSync(agentsDir)) {
            const folders = fs.readdirSync(agentsDir);
            for (const folder of folders) {
                const soulPath = path.join(agentsDir, folder, 'SOUL.md');
                const idPath = path.join(agentsDir, folder, 'IDENTITY.md');
                let combined = '';
                
                if (fs.existsSync(idPath)) combined += fs.readFileSync(idPath, 'utf-8') + '\n\n';
                if (fs.existsSync(soulPath)) combined += fs.readFileSync(soulPath, 'utf-8');
                
                if (combined) {
                    runBridge('ingest', { text: combined, source: `${folder}_profile`, collection: 'souls' });
                }
            }
        }
    } else if (target === 'knowledge') {
        console.log(">>> [CLI] Rebuilding 'knowledge' vector collection...");
        runBridge('reset', { collection: 'knowledge' });
        
        const knowDir = path.resolve(__dirname, '../../configs/knowledge');
        if (fs.existsSync(knowDir)) {
            const files = fs.readdirSync(knowDir).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
            for (const file of files) {
                const content = fs.readFileSync(path.join(knowDir, file), 'utf-8');
                runBridge('ingest', { text: content, source: file, collection: 'knowledge' });
            }
        } else {
            console.log(">>> [CLI] Directory configs/knowledge/ does not exist. Creating it now...");
            fs.mkdirSync(knowDir, { recursive: true });
        }
    } else if (target === 'archive') {
        console.log(">>> [CLI] Archiving historical SQLite chats into ChromaDB...");

        // Fetch messages older than yesterday (SQLite date modifier: '-1 day')
        const oldChats = db.prepare(`
            SELECT id, role, content, timestamp 
            FROM chat_history 
            WHERE timestamp < date('now', '-1 day') 
            ORDER BY id ASC
        `).all() as any[];

        if (oldChats.length === 0) {
            console.log(">>> [CLI] No historical chats older than yesterday to archive.");
            return;
        }

        // Format the raw chats into a script
        let chatTranscript = `Historical Chat Log:\n\n`;
        oldChats.forEach(c => {
            chatTranscript += `[${c.timestamp}] ${c.role.toUpperCase()}: ${c.content}\n`;
        });

        console.log(`>>> [CLI] Generating semantic summary for ${oldChats.length} messages...`);

        // Import and use the engine directly to summarize (Bypassing agent translation layers)
        const { sendLlamaCompletion } = await import('../../../../engine/llama-client.ts');
        
        try {
            const summaryResponse = await sendLlamaCompletion([
                { role: 'system', content: 'You are an archivist. Summarize the following chat transcript into a highly detailed, chronological memory file highlighting key decisions, tasks completed, and technical constraints discovered. Do not use conversational filler.' },
                { role: 'user', content: chatTranscript }
            ], { model: 'llama-3-groq-8b-tool-use', max_tokens: 1500 });

            const summary = summaryResponse.content;

            // Ingest the summary into ChromaDB
            const archiveDate = new Date().toISOString().split('T')[0];
            runBridge('ingest', { 
                text: `Archive Date: ${archiveDate}\n\n${summary}`, 
                source: `chat_archive_${archiveDate}`, 
                collection: 'archive' 
            });

            // Purge the old records from SQLite
            const deleteStmt = db.prepare(`DELETE FROM chat_history WHERE timestamp < date('now', '-1 day')`);
            const deleteResult = deleteStmt.run();
            console.log(`>>> [CLI] Successfully purged ${deleteResult.changes} messages from SQLite short-term memory.`);

        } catch (err: any) {
            console.error(`>>> [CLI ERROR] Failed to generate archive summary: ${err.message}`);
        }
    }
}