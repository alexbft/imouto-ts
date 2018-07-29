import { Filter } from 'core/filter/filter';
import { UserService } from 'core/tg/user_service';
import { Message, CallbackQuery } from 'node-telegram-bot-api';

export class BannedFilter implements Filter {
  constructor(
    private readonly userService: UserService) { }

  allowMessage(msg: Message): boolean {
    return msg.from == null || !this.userService.hasRole(msg.from, 'banned');
  }

  allowCallbackQuery(query: CallbackQuery): boolean {
    return !this.userService.hasRole(query.from, 'banned');
  }
}
