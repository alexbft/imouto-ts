import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { Filter } from 'core/filter/filter';

export class BaseFilter implements Filter {
  allowMessage(_message: Message): boolean {
    return true;
  }

  allowCallbackQuery(_query: CallbackQuery): boolean {
    return true;
  }
}
