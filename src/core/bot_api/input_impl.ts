import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { Subject } from 'rxjs';
import { InputSource, InputSink, Input } from 'core/bot_api/input';
import { FilteredInput } from 'core/bot_api/filtered_input';

export class InputImpl implements InputSource, InputSink {
  readonly messages = new Subject<Message>();
  readonly callbackQueries = new Subject<CallbackQuery>();
  readonly input: Input = new FilteredInput(this, []);

  handleMessage(msg: Message): void {
    this.messages.next(msg);
  }

  handleCallbackQuery(query: CallbackQuery): void {
    this.callbackQueries.next(query);
  }
}
