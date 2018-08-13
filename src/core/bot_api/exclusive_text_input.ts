import { TextMatchHandler, MessageErrorHandler, IFilteredInput, ExclusiveInput } from 'core/bot_api/input';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { Subscription } from 'rxjs';
import { fixPattern, removeItem } from 'core/util/misc';
import { logger } from 'core/logging/logger';
import { Filter } from 'core/filter/filter';

type WrappedTextHandler = (message: Message) => Promise<boolean>;

export class ExclusiveTextInput implements ExclusiveInput {
  private readonly handlers: WrappedTextHandler[] = [];

  constructor(input: IFilteredInput) {
    input.textMessages.subscribe(async (msg: Message) => {
      for (const handler of this.handlers) {
        if (await handler(msg)) {
          break;
        }
      }
    });
  }

  _onText(regex: RegExp, filters: Filter[], handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription {
    const fixedRegex = fixPattern(regex);
    const _filters = filters;
    const wrapped: WrappedTextHandler = async (msg: Message) => {
      const result = fixedRegex.exec(msg.text!);
      if (result !== null) {
        try {
          await handler(new TextMatch(msg, result));
        } catch (e) {
          logger.error(e.stack || e);
          if (onError != null) {
            await onError(msg, e);
          }
        }
      }
      return result !== null;
    };
    let wrapped2: WrappedTextHandler;
    if (_filters.length === 0) {
      wrapped2 = wrapped;
    } else {
      wrapped2 = (msg: Message) => {
        if (!_filters.every(f => f.allowMessage(msg))) {
          return Promise.resolve(false);
        }
        return wrapped(msg);
      }
    }
    this.handlers.push(wrapped2);
    return new Subscription(() => {
      removeItem(this.handlers, wrapped2);
    });
  }

  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription {
    return this._onText(regex, [], handler, onError);
  }

  filter(...filters: Filter[]): ExclusiveInput {
    return new FilteredExclusiveInput(this, filters);
  }
}

class FilteredExclusiveInput implements ExclusiveInput {
  constructor(
    private readonly parent: ExclusiveTextInput,
    private readonly filters: Filter[]
  ) { }

  onText(regex: RegExp, handler: TextMatchHandler, onError?: MessageErrorHandler): Subscription {
    return this.parent._onText(regex, this.filters, handler, onError);
  }

  filter(...filters: Filter[]): ExclusiveInput {
    return new FilteredExclusiveInput(this.parent, [...this.filters, ...filters]);
  }
}
