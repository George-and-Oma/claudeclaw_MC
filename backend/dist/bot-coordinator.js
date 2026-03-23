/**
 * Bot Coordinator
 * Handles cross-bot communication, delegation, and collaboration
 */
import { Orchestrator } from './orchestrator.js';
import { logger } from './logger.js';
// Bot capabilities and what they can request from each other
const BOT_CAPABILITIES = {
    ops: {
        canRequest: ['research', 'marketing', 'finance', 'support'],
        provides: ['scheduling', 'task_assignment', 'coordination', 'status_updates']
    },
    research: {
        canRequest: ['ops', 'marketing'],
        provides: ['market_research', 'competitor_analysis', 'data_gathering', 'reports']
    },
    marketing: {
        canRequest: ['ops', 'research', 'finance'],
        provides: ['content_creation', 'campaign_planning', 'social_media', 'brand_strategy']
    },
    finance: {
        canRequest: ['ops', 'support'],
        provides: ['budget_info', 'expense_tracking', 'invoicing', 'financial_reports']
    },
    support: {
        canRequest: ['ops', 'finance', 'research'],
        provides: ['customer_info', 'ticket_handling', 'feedback_collection', 'issue_resolution']
    }
};
export class BotCoordinator {
    orch;
    constructor() {
        this.orch = new Orchestrator();
    }
    // Bot requests help from another bot
    requestFromBot(fromBot, toBot, requestType, payload, priority = 'medium') {
        const capabilities = BOT_CAPABILITIES[fromBot];
        if (!capabilities || !capabilities.canRequest.includes(toBot)) {
            logger.warn({ fromBot, toBot }, 'Invalid bot-to-bot request');
            throw new Error(`${fromBot} cannot request from ${toBot}`);
        }
        const message = JSON.stringify({
            type: requestType,
            payload,
            priority,
            timestamp: new Date().toISOString()
        });
        const msgId = this.orch.sendBotMessage(fromBot, toBot, message);
        this.orch.logActivity(fromBot, 'request_sent', `Requested ${requestType} from ${toBot}`);
        this.orch.logActivity(toBot, 'request_received', `Received ${requestType} from ${fromBot}`);
        logger.info({ fromBot, toBot, requestType, msgId }, 'Bot-to-bot request created');
        return msgId;
    }
    // Process pending requests for a bot
    processPendingRequests(bot) {
        const pending = this.orch.getPendingMessages(bot);
        return pending.map(msg => {
            try {
                const parsed = JSON.parse(msg.message);
                return {
                    id: msg.id,
                    from: msg.from_bot,
                    to: msg.to_bot,
                    type: parsed.type,
                    payload: parsed.payload,
                    priority: parsed.priority || 'medium',
                    status: 'pending',
                    createdAt: new Date(msg.created_at)
                };
            }
            catch {
                return {
                    id: msg.id,
                    from: msg.from_bot,
                    to: msg.to_bot,
                    type: 'unknown',
                    payload: { raw: msg.message },
                    priority: 'medium',
                    status: 'pending',
                    createdAt: new Date(msg.created_at)
                };
            }
        });
    }
    // Respond to a bot request
    respondToRequest(requestId, response, success = true) {
        const responseStr = JSON.stringify({
            success,
            data: response,
            timestamp: new Date().toISOString()
        });
        this.orch.markActioned(requestId, responseStr);
        logger.info({ requestId, success }, 'Bot request responded');
    }
    // Delegate a task to another bot
    delegateTask(fromBot, toBot, taskTitle, taskDescription, priority = 'medium') {
        const taskId = this.orch.createTask(taskTitle, toBot, {
            description: `[Delegated by ${fromBot}] ${taskDescription}`,
            priority
        });
        this.requestFromBot(fromBot, toBot, 'task_delegation', {
            taskId,
            title: taskTitle,
            description: taskDescription
        }, priority);
        logger.info({ fromBot, toBot, taskId, taskTitle }, 'Task delegated');
        return taskId;
    }
    // Escalate to Ops for coordination
    escalateToOps(fromBot, issue, context) {
        return this.requestFromBot(fromBot, 'ops', 'escalation', {
            issue,
            context,
            urgency: 'high'
        }, 'high');
    }
    // Request research from Research bot
    requestResearch(fromBot, topic, requirements) {
        return this.requestFromBot(fromBot, 'research', 'research_request', {
            topic,
            requirements,
            deadline: null
        });
    }
    // Request budget info from Finance bot
    requestBudgetInfo(fromBot, category, period) {
        return this.requestFromBot(fromBot, 'finance', 'budget_inquiry', {
            category,
            period: period || 'current_month'
        });
    }
    // Request customer info from Support bot
    requestCustomerInfo(fromBot, customerId, query) {
        return this.requestFromBot(fromBot, 'support', 'customer_inquiry', {
            customerId,
            query
        });
    }
    // Broadcast message to all bots
    broadcast(fromBot, message, excludeBots = []) {
        const allBots = Object.keys(BOT_CAPABILITIES);
        for (const bot of allBots) {
            if (bot !== fromBot && !excludeBots.includes(bot)) {
                this.orch.sendBotMessage(fromBot, bot, JSON.stringify({
                    type: 'broadcast',
                    payload: { message },
                    timestamp: new Date().toISOString()
                }));
            }
        }
        this.orch.logActivity(fromBot, 'broadcast', message.slice(0, 100));
        logger.info({ fromBot, message: message.slice(0, 50) }, 'Broadcast sent');
    }
    // Get collaboration summary
    getCollaborationSummary() {
        const summary = this.orch.getDailySummary();
        const pending = {};
        for (const bot of Object.keys(BOT_CAPABILITIES)) {
            const msgs = this.orch.getPendingMessages(bot);
            pending[bot] = msgs.length;
        }
        return {
            totalRequests: summary.pendingMessages,
            pendingByBot: pending
        };
    }
    close() {
        this.orch.close();
    }
}
export default BotCoordinator;
