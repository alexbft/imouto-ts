import { PromiseOr } from 'core/util/promises';
import { EventEmitter } from 'events';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { logger } from 'core/logging/logger';

type MessageHandler = (msg: Message) => Promise<void>;

type TextMatchHandler = (match: TextMatch) => PromiseOr<any>;

type ErrorHandler = (message: Message, error: Error) => PromiseOr<any>;

function wrapMessageHandler(handler: MessageHandler, errorHandler?: ErrorHandler): MessageHandler {
  return async (msg) => {
    try {
      await handler(msg);
    } catch (e) {
      logger.error(e.stack || e);
      if (errorHandler != null) {
        await errorHandler(msg, e);
      }
    }
  }
}

export interface Input {
  onText(regex: RegExp, handler: TextMatchHandler, onError?: ErrorHandler): void;
}

export class InputImpl implements Input {
  private readonly eventEmitter = new EventEmitter();

  constructor() {
    this.eventEmitter.setMaxListeners(1000);
  }

  handleMessage(msg: Message): void {
    if (msg.text != null) {
      this.eventEmitter.emit('text', msg);
    }
  }

  onText(regex: RegExp, handler: TextMatchHandler, onError?: ErrorHandler): void {
    this.eventEmitter.on('text', wrapMessageHandler(async (msg: Message) => {
      const result = regex.exec(msg.text!);
      if (result !== null) {
        await handler(new TextMatch(msg, result));
      }
    }, onError));
  }
}
