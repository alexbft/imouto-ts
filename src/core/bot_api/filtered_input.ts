import { Filter } from 'core/filter/filter';
import { IFilteredInput, InputSource, TextMatchHandler, MessageErrorHandler, wrapHandler, CallbackHandler, CallbackErrorHandler, TextInput, MessageHandler } from 'core/bot_api/input';
import { Observable, Subscription, Subject } from 'rxjs';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { removeItem, fixPattern } from 'core/util/misc';
import { LoggingFilter } from 'core/filter/logging_filter';
import { TextMatch } from 'core/bot_api/text_match';
import { ExclusiveTextInput } from 'core/bot_api/exclusive_text_input';

export class FilteredInput implements IFilteredInput {
  readonly messages: Observable<Message>;
  readonly callbackQueries: Observable<CallbackQuery>;
  readonly textMessages: Observable<Message>;

  constructor(parent: InputSource, private readonly filters: Filter[]) {
    this.messages = parent.messages
      .filter(msg => filters.every(f => f.allowMessage(msg)))
      .multicast(new Subject())
      .refCount();
    this.callbackQueries = parent.callbackQueries
      .filter(query => filters.every(f => f.allowCallbackQuery(query)))
      .multicast(new Subject())
      .refCount();
    this.textMessages = this.messages.filter(msg => msg.text != null);
  }

  installGlobalFilter(filter: Filter, rejectReason?: string): Subscription {
    filter = rejectReason != null ? new LoggingFilter(filter, rejectReason) : filter;
    this.filters.push(filter);
    return new Subscription(() => {
      removeItem(this.filters, filter);
    });
  }

  onMessage(handler: MessageHandler, onError?: MessageErrorHandler): Subscription {
    return this.messages.subscribe(wrapHandler(handler, onError));
  }

  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription {
    regex = fixPattern(regex);
    return this.textMessages.subscribe(wrapHandler(async (msg: Message) => {
      const result = regex.exec(msg.text!);
      if (result !== null) {
        await handler(new TextMatch(msg, result));
      }
    }, onError));
  }

  onCallback(forMessage: Message, handler: CallbackHandler, onError?: CallbackErrorHandler): Subscription {
    const messageId = forMessage.message_id;
    const chatId = forMessage.chat.id;
    return this.callbackQueries.subscribe(wrapHandler(async (query: CallbackQuery) => {
      if (query.message != null && query.message.message_id === messageId && query.message.chat.id === chatId) {
        await handler(query);
      }
    }, onError));
  }

  exclusiveMatch(): TextInput {
    return new ExclusiveTextInput(this);
  }

  filter(...filters: Filter[]): FilteredInput {
    return new FilteredInput(this, filters);
  }
}
