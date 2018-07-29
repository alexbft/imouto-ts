import { PromiseOr } from 'core/util/promises';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { logger } from 'core/logging/logger';
import { Subject, Subscription } from 'rxjs';
import { fixPattern } from 'core/util/misc';

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

export interface TextInput {
  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription;
}

export abstract class Input implements TextInput {
  abstract onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription;
  abstract onCallback(message: Message, handler: CallbackHandler, onError?: CallbackErrorHandler): Subscription;
  abstract exclusiveMatch(): TextInput;
}

export class InputImpl extends Input {
  readonly textSubject = new Subject<Message>();
  readonly callbackSubject = new Subject<CallbackQuery>();

  handleMessage(msg: Message): void {
    if (msg.text != null) {
      this.textSubject.next(msg);
    }
  }

  handleCallbackQuery(query: CallbackQuery): void {
    this.callbackSubject.next(query);
  }

  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription {
    regex = fixPattern(regex);
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

  exclusiveMatch(): TextInput {
    return new ExclusiveTextInput(this);
  }
}

interface ErrorAwareHandler {
  handler: TextMatchHandler;
  onError?: MessageErrorHandler;
}

class ExclusiveTextInput implements TextInput {
  private handlers: Map<RegExp, ErrorAwareHandler> = new Map();

  constructor(input: InputImpl) {
    input.textSubject.subscribe(async (msg: Message) => {
      for (const [regex, { handler, onError }] of this.handlers) {
        const result = regex.exec(msg.text!);
        if (result !== null) {
          const handle = (msg: Message) => handler(new TextMatch(msg, result));
          await wrapHandler(handle, onError)(msg);
          break;
        }
      }
    });
  }

  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription {
    regex = fixPattern(regex);
    this.handlers.set(regex, { handler, onError });
    return new Subscription(() => {
      this.handlers.delete(regex);
    });
  }
}
