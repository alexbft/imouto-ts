import { PromiseOr } from 'core/util/promises';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { logger } from 'core/logging/logger';
import { Subscription, Observable } from 'rxjs';
import { Filter } from 'core/filter/filter';

export type MessageHandler = (message: Message) => PromiseOr<any>;

export type TextMatchHandler = (match: TextMatch) => PromiseOr<any>;

export type MessageErrorHandler = (message: Message, error: Error) => PromiseOr<any>;

export type CallbackHandler = (query: CallbackQuery) => PromiseOr<any>;

export type CallbackErrorHandler = (query: CallbackQuery, error: Error) => PromiseOr<any>;

export function wrapHandler<T>(handler: (data: T) => any, errorHandler?: (data: T, error: Error) => any): (data: T) => Promise<void> {
  return async (msg) => {
    try {
      await handler(msg);
    } catch (e: any) {
      logger.error(e.stack || e);
      if (errorHandler != null) {
        await errorHandler(msg, e);
      }
    }
  }
}

export interface InputSource {
  readonly messages: Observable<Message>;
  readonly callbackQueries: Observable<CallbackQuery>;
}

export interface InputSink {
  handleMessage(message: Message): void;
  handleCallbackQuery(query: CallbackQuery): void;
}

export interface TextInput {
  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription;
}

export interface ExclusiveInput extends TextInput {
  filter(...filters: Filter[]): ExclusiveInput;
}

export interface IFilteredInput extends InputSource, TextInput {
  readonly textMessages: Observable<Message>;
  onMessage(handler: MessageHandler, onError?: MessageErrorHandler): Subscription;
  onCallback(message: Message, handler: CallbackHandler, onError?: CallbackErrorHandler): Subscription;
  exclusiveMatch(): ExclusiveInput;
  filter(...filters: Filter[]): IFilteredInput;
  installGlobalFilter(filter: Filter, rejectReason?: string): Subscription;
}

export abstract class Input implements IFilteredInput {
  abstract readonly messages: Observable<Message>;
  abstract readonly textMessages: Observable<Message>;
  abstract readonly callbackQueries: Observable<CallbackQuery>;
  abstract onMessage(handler: MessageHandler, onError?: MessageErrorHandler): Subscription;
  abstract onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription;
  abstract onCallback(message: Message, handler: CallbackHandler, onError?: CallbackErrorHandler): Subscription;
  abstract exclusiveMatch(): ExclusiveInput;
  abstract filter(...filters: Filter[]): IFilteredInput;
  abstract installGlobalFilter(filter: Filter, rejectReason?: string): Subscription;
}
