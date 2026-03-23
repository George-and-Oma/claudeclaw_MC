import { saveWaIncoming, getPendingWaMessages, markWaMessageSent, markWaMessageFailed, queueWaMessage, getWaChats, getWaMessages, setWaMapping, getTelegramChatForWa, } from './db.js';
import { logger } from './logger.js';
let notifySender = null;
// Re-export DB functions for convenience
export { queueWaMessage, getWaChats, getWaMessages, setWaMapping };
export function setWaNotifySender(sender) {
    notifySender = sender;
}
export async function handleWaIncoming(messageId, jid, sender, body, timestamp) {
    saveWaIncoming(messageId, jid, sender, body, timestamp);
    // Notify mapped Telegram chat
    const chatId = getTelegramChatForWa(jid);
    if (chatId && notifySender) {
        const preview = body.length > 100 ? body.slice(0, 97) + '...' : body;
        await notifySender(chatId, `WhatsApp from ${sender}:\n${preview}`);
    }
}
export async function processWaOutbox(sendWa) {
    const pending = getPendingWaMessages();
    for (const msg of pending) {
        try {
            const ok = await sendWa(msg.jid, msg.body);
            if (ok) {
                markWaMessageSent(msg.id);
            }
            else {
                markWaMessageFailed(msg.id);
            }
        }
        catch (err) {
            logger.error({ err, msgId: msg.id }, 'Failed to send WhatsApp message');
            markWaMessageFailed(msg.id);
        }
    }
}
export function formatWaChatList(chats) {
    if (chats.length === 0)
        return 'No WhatsApp chats yet.';
    const lines = chats.map((c, i) => {
        const name = c.jid.replace(/@s\.whatsapp\.net$/, '');
        const preview = c.last_message.length > 50 ? c.last_message.slice(0, 47) + '...' : c.last_message;
        const time = new Date(c.timestamp * 1000).toLocaleString();
        return `${i + 1}. ${name} — ${preview} (${time})`;
    });
    return `WhatsApp chats:\n${lines.join('\n')}\n\nReply with /wa <number> to view messages, or /wa send <number> <message> to reply.`;
}
export function formatWaMessages(jid, messages) {
    if (messages.length === 0)
        return 'No messages in this chat.';
    const name = jid.replace(/@s\.whatsapp\.net$/, '');
    const lines = messages.reverse().map(m => {
        const who = m.is_from_me ? 'You' : m.sender.replace(/@s\.whatsapp\.net$/, '');
        const time = new Date(m.timestamp * 1000).toLocaleTimeString();
        return `[${time}] ${who}: ${m.body}`;
    });
    return `Messages with ${name}:\n${lines.join('\n')}`;
}
