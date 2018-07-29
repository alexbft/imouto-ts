import { TextMatchHandler, MessageErrorHandler, TextInput, wrapHandler, IFilteredInput } from 'core/bot_api/input';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { Subscription } from 'rxjs';
import { fixPattern } from 'core/util/misc';

interface ErrorAwareHandler {
  handler: TextMatchHandler;
  onError?: MessageErrorHandler;
}

export class ExclusiveTextInput implements TextInput {
  private readonly handlers: Map<RegExp, ErrorAwareHandler> = new Map();

  constructor(input: IFilteredInput) {
    input.textMessages.subscribe(async (msg: Message) => {
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
