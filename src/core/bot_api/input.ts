import { PromiseOr } from 'core/util/promises';
import { EventEmitter } from 'events';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';

type TextMatchHandler = (match: TextMatch) => PromiseOr<void>;

export interface Input {
  onText(regex: RegExp, handler: TextMatchHandler): void;
}

export class InputImpl implements Input {
  private readonly eventEmitter = new EventEmitter();

  handleMessage(msg: Message): void {
    if (msg.text != null) {
      this.eventEmitter.emit('text', msg);
    }
  }

  onText(regex: RegExp, handler: TextMatchHandler): void {
    this.eventEmitter.on('text', async (msg: Message) => {
      const result = regex.exec(msg.text!);
      if (result !== null) {
        await handler(new TextMatch(msg, result));
      }
    });
  }
}
