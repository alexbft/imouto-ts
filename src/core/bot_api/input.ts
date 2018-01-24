import { PromiseOr } from 'core/util/promises';
import { EventEmitter } from 'events';
import { Message } from 'node-telegram-bot-api';

type MessageHandler = (msg: Message, match: RegExpExecArray) => PromiseOr<void>;
type ErrorHandler = (msg: Message, err: Error) => any;

export interface Input {
  onText(regex: RegExp, handler: MessageHandler, errorHandler?: ErrorHandler): void;
}

export class InputImpl implements Input {
  private readonly eventEmitter = new EventEmitter();

  handleMessage(msg: Message): void {
    if (msg.text != null) {
      this.eventEmitter.emit('text', msg);
    }
  }

  onText(regex: RegExp, handler: MessageHandler, errorHandler: ErrorHandler = (_, e) => { throw e; }): void {
    this.eventEmitter.on('text', async (msg: Message) => {
      if (msg.text != null && regex.test(msg.text)) {
        try {
          await handler(msg, regex.exec(msg.text)!);
        } catch (e) {
          console.error(e);
          errorHandler(msg, e);
        }
      }
    });
  }
}
