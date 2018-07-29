import { Filter } from 'core/filter/filter';
import { Message, CallbackQuery } from 'node-telegram-bot-api';
import { logger } from 'core/logging/logger';

export class LoggingFilter implements Filter {
  constructor(
    private readonly parent: Filter,
    private readonly rejectReason: string) { }

  allowMessage(message: Message): boolean {
    const result = this.parent.allowMessage(message);
    if (!result) {
      logger.info(`Rejected message [id=${message.message_id}]: ${this.rejectReason}`);
    }
    return result;
  }

  allowCallbackQuery(query: CallbackQuery): boolean {
    const result = this.parent.allowCallbackQuery(query);
    if (!result) {
      logger.info(`Rejected callback query [id=${query.id}]: ${this.rejectReason}`);
    }
    return result;
  }
}
