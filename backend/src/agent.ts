import { query } from '@anthropic-ai/claude-agent-sdk'
import { PROJECT_ROOT } from './config.js'
import { logger } from './logger.js'

export interface AgentConfig {
  systemPrompt?: string
  model?: string
  disallowedTools?: string[]
}

export interface UsageData {
  input_tokens: number
  output_tokens: number
  cache_read_tokens: number
  cache_creation_tokens: number
  total_cost_usd: number
  duration_ms: number
  num_turns: number
  model: string | null
}

export interface AgentResult {
  text: string | null
  newSessionId?: string
  usage?: UsageData
}

export async function runAgent(
  message: string,
  sessionId?: string,
  onTyping?: () => void,
  agentConfig?: AgentConfig
): Promise<AgentResult> {
  let text: string | null = null
  let newSessionId: string | undefined
  let usage: UsageData | undefined

  const typingInterval = onTyping ? setInterval(onTyping, 4000) : undefined

  // Prepend system prompt if agent config provides one
  const fullMessage = agentConfig?.systemPrompt
    ? `[System context from agent profile]:\n${agentConfig.systemPrompt}\n\n---\n\n${message}`
    : message

  try {
    const options: Record<string, unknown> = {
      cwd: PROJECT_ROOT,
      ...(sessionId ? { resume: sessionId } : {}),
      settingSources: ['project', 'user'],
      permissionMode: 'bypassPermissions',
    }

    if (agentConfig?.model && agentConfig.model !== 'inherit') {
      options.model = agentConfig.model
    }

    if (agentConfig?.disallowedTools && agentConfig.disallowedTools.length > 0) {
      options.disallowedTools = agentConfig.disallowedTools
    }

    const events = query({
      prompt: fullMessage,
      options: options as Parameters<typeof query>[0]['options'],
    })

    for await (const event of events) {
      if (event.type === 'system' && event.subtype === 'init') {
        newSessionId = event.session_id
        logger.debug({ sessionId: newSessionId }, 'Session initialized')
      }
      if (event.type === 'result') {
        if (event.subtype === 'success') {
          text = event.result ?? null
        }
        // Extract usage from both success and error result events
        const ev = event as Record<string, unknown>
        const u = ev.usage as Record<string, number> | undefined
        const modelUsage = ev.modelUsage as Record<string, unknown> | undefined
        const modelName = modelUsage ? Object.keys(modelUsage)[0] ?? null : null
        usage = {
          input_tokens: u?.input_tokens ?? 0,
          output_tokens: u?.output_tokens ?? 0,
          cache_read_tokens: u?.cache_read_input_tokens ?? 0,
          cache_creation_tokens: u?.cache_creation_input_tokens ?? 0,
          total_cost_usd: (ev.total_cost_usd as number) ?? 0,
          duration_ms: (ev.duration_ms as number) ?? 0,
          num_turns: (ev.num_turns as number) ?? 0,
          model: modelName,
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'Agent error')
    text = null
  } finally {
    if (typingInterval) clearInterval(typingInterval)
  }

  return { text, newSessionId, usage }
}
