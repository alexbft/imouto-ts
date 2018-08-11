import { Message } from 'node-telegram-bot-api';

const cacheLimit = 1000;

export class MessageCache {
  private readonly messageIds: number[] = [];
  private readonly messages: Map<number, Message> = new Map();

  add(message: Message): void {
    if (this.messageIds.length >= cacheLimit) {
      const idToDelete = this.messageIds.shift();
      this.messages.delete(idToDelete!);
    }
    this.messages.set(message.message_id, message);
    this.messageIds.push(message.message_id);
  }

  getById(id: number): Message | undefined {
    return this.messages.get(id);
  }

  tryResolve(message: Message): Message {
    return this.getById(message.message_id) || message;
  }
}
