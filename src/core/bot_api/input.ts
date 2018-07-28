import { PromiseOr } from 'core/util/promises';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { logger } from 'core/logging/logger';
import { Subject, Subscription } from 'rxjs';

type TextMatchHandler = (match: TextMatch) => PromiseOr<any>;

type MessageErrorHandler = (message: Message, error: Error) => PromiseOr<any>;

type CallbackHandler = (query: CallbackQuery) => PromiseOr<any>;

type CallbackErrorHandler = (query: CallbackQuery, error: Error) => PromiseOr<any>;

function wrapHandler<T>(handler: (data: T) => any, errorHandler?: (data: T, error: Error) => any): (data: T) => Promise<void> {
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

export abstract class Input {
  abstract onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription;
  abstract onCallback(message: Message, handler: CallbackHandler, onError?: CallbackErrorHandler): Subscription;
}

export class InputImpl extends Input {
  private readonly textSubject = new Subject<Message>();
  private readonly callbackSubject = new Subject<CallbackQuery>();

  handleMessage(msg: Message): void {
    if (msg.text != null) {
      this.textSubject.next(msg);
    }
  }

  handleCallbackQuery(query: CallbackQuery): void {
    this.callbackSubject.next(query);
  }

  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription {
    return this.textSubject.subscribe(wrapHandler(async (msg: Message) => {
      const result = regex.exec(msg.text!);
      if (result !== null) {
        await handler(new TextMatch(msg, result));
      }
    }, onError));
  }

  onCallback(forMessage: Message, handler: CallbackHandler, onError?: CallbackErrorHandler): Subscription {
    const messageId = forMessage.message_id;
    const chatId = forMessage.chat.id;
    return this.callbackSubject.subscribe(wrapHandler(async (query: CallbackQuery) => {
      if (query.message != null && query.message.message_id === messageId && query.message.chat.id === chatId) {
        await handler(query);
      }
    }, onError));
  }
}
