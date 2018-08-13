import { Filter } from 'core/filter/filter';
import { Message } from 'core/tg/tg_types';
import { CallbackQuery } from 'node-telegram-bot-api';

type MessagePredicate = (message: Message) => boolean;

export class MessageFilter implements Filter {
  constructor(private readonly predicate: MessagePredicate) { }

  allowMessage(msg: Message): boolean {
    return this.predicate(msg);
  }

  allowCallbackQuery(_query: CallbackQuery): boolean {
    return false;
  }
}

export function messageFilter(predicate: MessagePredicate): MessageFilter {
  return new MessageFilter(predicate);
}
