/**
 * Team Bot Router
 * Routes incoming messages to the appropriate department bot
 * and handles cross-bot communication
 */
import { Orchestrator } from './orchestrator.js';
import { BotCoordinator } from './bot-coordinator.js';
import { logger } from './logger.js';
// Bot skill mappings
const BOT_SKILLS = {
    ops: 'ops-bot',
    research: 'research-bot',
    marketing: 'marketing-bot',
    finance: 'finance-bot',
    support: 'support-bot'
};
let orchestrator = null;
let coordinator = null;
export function initTeamRouter() {
    try {
        orchestrator = new Orchestrator();
        coordinator = new BotCoordinator();
        logger.info('Team router and coordinator initialized');
        return true;
    }
    catch (err) {
        logger.warn({ err }, 'Team router init failed - continuing without team bots');
        return false;
    }
}
export function routeToBot(message) {
    if (!orchestrator)
        return null;
    return orchestrator.routeMessage(message);
}
export function getSkillForBot(botName) {
    return BOT_SKILLS[botName] || null;
}
export function logBotActivity(bot, action, details) {
    if (!orchestrator)
        return;
    orchestrator.logActivity(bot, action, details);
}
export function sendBotMessage(from, to, message) {
    if (!orchestrator)
        return null;
    return orchestrator.sendBotMessage(from, to, message);
}
export function getPendingBotMessages(bot) {
    if (!orchestrator)
        return [];
    return orchestrator.getPendingMessages(bot);
}
export function getDailySummary() {
    if (!orchestrator)
        return null;
    return orchestrator.getDailySummary();
}
export function createTask(title, owner, options) {
    if (!orchestrator)
        return null;
    return orchestrator.createTask(title, owner, options || {});
}
export function getBotTasks(owner, status) {
    if (!orchestrator)
        return [];
    return orchestrator.getTasks(owner, status);
}
// Cross-bot communication functions
export function requestFromBot(fromBot, toBot, requestType, payload, priority = 'medium') {
    if (!coordinator)
        return null;
    try {
        return coordinator.requestFromBot(fromBot, toBot, requestType, payload, priority);
    }
    catch (err) {
        logger.error({ err, fromBot, toBot }, 'Failed to send bot request');
        return null;
    }
}
export function delegateTask(fromBot, toBot, title, description, priority = 'medium') {
    if (!coordinator)
        return null;
    return coordinator.delegateTask(fromBot, toBot, title, description, priority);
}
export function escalateToOps(fromBot, issue, context) {
    if (!coordinator)
        return null;
    return coordinator.escalateToOps(fromBot, issue, context);
}
export function requestResearch(fromBot, topic, requirements) {
    if (!coordinator)
        return null;
    return coordinator.requestResearch(fromBot, topic, requirements);
}
export function requestBudgetInfo(fromBot, category, period) {
    if (!coordinator)
        return null;
    return coordinator.requestBudgetInfo(fromBot, category, period);
}
export function broadcastToAllBots(fromBot, message) {
    if (!coordinator)
        return;
    coordinator.broadcast(fromBot, message);
}
export function getCollaborationSummary() {
    if (!coordinator)
        return null;
    return coordinator.getCollaborationSummary();
}
export function processBotRequests(bot) {
    if (!coordinator)
        return [];
    return coordinator.processPendingRequests(bot);
}
export function respondToBotRequest(requestId, response, success = true) {
    if (!coordinator)
        return;
    coordinator.respondToRequest(requestId, response, success);
}
// Enhance message with routing context
export function enhanceMessageForBot(message, botName) {
    const skill = getSkillForBot(botName);
    if (!skill)
        return message;
    return '[Route: ' + botName + '] ' + message;
}
export function closeTeamRouter() {
    if (orchestrator) {
        orchestrator.close();
        orchestrator = null;
    }
    if (coordinator) {
        coordinator.close();
        coordinator = null;
    }
}
