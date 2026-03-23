import { searchMemories, getRecentMemories, touchMemory, insertMemory, decayMemories as dbDecay, } from './db.js';
import { logger } from './logger.js';
const SEMANTIC_SIGNALS = /\b(my|i am|i'm|i prefer|remember|always|never)\b/i;
export async function buildMemoryContext(chatId, userMessage) {
    const ftsResults = searchMemories(userMessage, chatId, 3);
    const recentResults = getRecentMemories(chatId, 5);
    // Deduplicate by id
    const seen = new Set();
    const combined = [];
    for (const m of [...ftsResults, ...recentResults]) {
        if (!seen.has(m.id)) {
            seen.add(m.id);
            combined.push(m);
        }
    }
    if (combined.length === 0)
        return '';
    // Touch each accessed memory
    for (const m of combined) {
        touchMemory(m.id);
    }
    const lines = combined.map(m => `- ${m.content} (${m.sector})`);
    return `[Memory context]\n${lines.join('\n')}`;
}
export async function saveConversationTurn(chatId, userMsg, assistantMsg) {
    // Skip short messages and commands
    if (userMsg.length <= 20 || userMsg.startsWith('/'))
        return;
    const sector = SEMANTIC_SIGNALS.test(userMsg) ? 'semantic' : 'episodic';
    const content = `User: ${userMsg.slice(0, 200)}\nAssistant: ${assistantMsg.slice(0, 300)}`;
    insertMemory(chatId, content, sector);
    logger.debug({ chatId, sector }, 'Saved conversation turn to memory');
}
export function runDecaySweep() {
    dbDecay();
}
