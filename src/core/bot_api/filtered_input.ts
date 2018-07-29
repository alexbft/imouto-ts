import { Filter } from 'core/filter/filter';
import { IFilteredInput, InputSource } from 'core/bot_api/input';
import { BaseInput } from 'core/bot_api/base_input';
import { Observable, Subscription, Subject } from 'rxjs';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { removeItem } from 'core/util/misc';
import { LoggingFilter } from 'core/filter/logging_filter';

export class FilteredInput extends BaseInput implements IFilteredInput {
  readonly messages: Observable<Message>;
  readonly callbackQueries: Observable<CallbackQuery>;

  constructor(parent: InputSource, private readonly filters: Filter[]) {
    super();
    this.messages = parent.messages
      .filter(msg => filters.every(f => f.allowMessage(msg)))
      .multicast(new Subject())
      .refCount();
    this.callbackQueries = parent.callbackQueries
      .filter(query => filters.every(f => f.allowCallbackQuery(query)))
      .multicast(new Subject())
      .refCount();
  }

  installGlobalFilter(filter: Filter, rejectReason?: string): Subscription {
    filter = rejectReason != null ? new LoggingFilter(filter, rejectReason) : filter;
    this.filters.push(filter);
    return new Subscription(() => {
      removeItem(this.filters, filter);
    });
  }
}
