import { Input, TextMatchHandler, MessageErrorHandler, wrapHandler, CallbackHandler, CallbackErrorHandler, TextInput, IBaseInput } from 'core/bot_api/input';
import { Subscription, Observable } from 'rxjs';
import { fixPattern } from 'core/util/misc';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { ExclusiveTextInput } from 'core/bot_api/exclusive_text_input';
import { Filter } from 'core/filter/filter';
import { FilteredInput } from 'core/bot_api/filtered_input';

export abstract class BaseInput implements IBaseInput {
  abstract messages: Observable<Message>;
  abstract callbackQueries: Observable<CallbackQuery>;

  private _textMessages?: Observable<Message>;

  get textMessages(): Observable<Message> {
    if (this._textMessages == null) {
      this._textMessages = this.messages.filter(msg => msg.text != null);
    }
    return this._textMessages;
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

  filter(...filters: Filter[]): Input {
    return new FilteredInput(this, filters);
  }
}
