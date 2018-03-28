import { PromiseOr } from 'core/util/promises';
import { EventEmitter } from 'events';
import { Message } from 'node-telegram-bot-api';

type MessageHandler = (msg: Message, match: RegExpExecArray) => PromiseOr<void>;

export interface Input {
  onText(regex: RegExp, handler: MessageHandler): void;
}

export class InputImpl implements Input {
  private readonly eventEmitter = new EventEmitter();

  handleMessage(msg: Message): void {
    if (msg.text != null) {
      this.eventEmitter.emit('text', msg);
    }
  }

  onText(regex: RegExp, handler: MessageHandler): void {
    this.eventEmitter.on('text', async (msg: Message) => {
      const result = regex.exec(msg.text || '')
      if (msg.text != null && result !== null) {
        await handler(msg, result);
      }
    });
  }
}
