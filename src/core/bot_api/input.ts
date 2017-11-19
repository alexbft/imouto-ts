import { EventEmitter } from 'events';
import { Message } from 'node-telegram-bot-api';

type MessageHandler = (msg: Message) => void;

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
    this.eventEmitter.on('text', (msg) => {
      if (regex.test(msg.text)) {
        handler(msg);
      }
    });
  }
}
