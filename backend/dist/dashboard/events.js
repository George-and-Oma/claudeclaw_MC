import { EventEmitter } from 'events';
class EventBus extends EventEmitter {
    emit(event, ...args) {
        return super.emit(event, ...args);
    }
    activity(type, summary, opts) {
        const event = {
            type,
            summary,
            agentId: opts?.agentId,
            chatId: opts?.chatId,
            metadata: opts?.metadata,
            timestamp: Date.now(),
        };
        this.emit('activity', event);
    }
}
export const eventBus = new EventBus();
