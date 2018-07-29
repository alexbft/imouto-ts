import { Message, CallbackQuery } from 'node-telegram-bot-api';

export interface Filter {
  allowMessage(message: Message): boolean;
  allowCallbackQuery(query: CallbackQuery): boolean;
}
