import { query } from '@anthropic-ai/claude-agent-sdk';
import { PROJECT_ROOT } from './config.js';
import { logger } from './logger.js';
export async function runAgent(message, sessionId, onTyping, agentConfig) {
    let text = null;
    let newSessionId;
    let usage;
    const typingInterval = onTyping ? setInterval(onTyping, 4000) : undefined;
    // Prepend system prompt if agent config provides one
    const fullMessage = agentConfig?.systemPrompt
        ? `[System context from agent profile]:\n${agentConfig.systemPrompt}\n\n---\n\n${message}`
        : message;
    try {
        const options = {
            cwd: PROJECT_ROOT,
            ...(sessionId ? { resume: sessionId } : {}),
            settingSources: ['project', 'user'],
            permissionMode: 'bypassPermissions',
        };
        if (agentConfig?.model && agentConfig.model !== 'inherit') {
            options.model = agentConfig.model;
        }
        if (agentConfig?.disallowedTools && agentConfig.disallowedTools.length > 0) {
            options.disallowedTools = agentConfig.disallowedTools;
        }
        const events = query({
            prompt: fullMessage,
            options: options,
        });
        for await (const event of events) {
            if (event.type === 'system' && event.subtype === 'init') {
                newSessionId = event.session_id;
                logger.debug({ sessionId: newSessionId }, 'Session initialized');
            }
            if (event.type === 'result') {
                if (event.subtype === 'success') {
                    text = event.result ?? null;
                }
                // Extract usage from both success and error result events
                const ev = event;
                const u = ev.usage;
                const modelUsage = ev.modelUsage;
                const modelName = modelUsage ? Object.keys(modelUsage)[0] ?? null : null;
                usage = {
                    input_tokens: u?.input_tokens ?? 0,
                    output_tokens: u?.output_tokens ?? 0,
                    cache_read_tokens: u?.cache_read_input_tokens ?? 0,
                    cache_creation_tokens: u?.cache_creation_input_tokens ?? 0,
                    total_cost_usd: ev.total_cost_usd ?? 0,
                    duration_ms: ev.duration_ms ?? 0,
                    num_turns: ev.num_turns ?? 0,
                    model: modelName,
                };
            }
        }
    }
    catch (err) {
        logger.error({ err }, 'Agent error');
        text = null;
    }
    finally {
        if (typingInterval)
            clearInterval(typingInterval);
    }
    return { text, newSessionId, usage };
}
