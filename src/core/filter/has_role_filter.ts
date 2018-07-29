import { Message, CallbackQuery, User } from 'node-telegram-bot-api';
import { UserService } from 'core/tg/user_service';
import { Filter } from 'core/filter/filter';

export class HasRoleFilter implements Filter {
  constructor(
    private readonly userService: UserService,
    private readonly role: string) { }

  allowMessage(msg: Message): boolean {
    return msg.from != null && this.hasRole(msg.from);
  }

  allowCallbackQuery(query: CallbackQuery): boolean {
    return this.hasRole(query.from);
  }

  private hasRole(user: User): boolean {
    if (this.userService.hasRole(user, this.role)) {
      return true;
    }
    if (this.role === 'admin') {
      return false;
    }
    return this.userService.hasRole(user, 'admin');
  }
}
