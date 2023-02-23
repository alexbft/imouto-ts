import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { messageFilter } from 'core/filter/message_filter';
import { UserService } from 'core/tg/user_service';

@Injectable
export class KekPlugin implements BotPlugin {
  readonly name = 'Rakhkek';

  constructor(private input: Input, private api: TgApi, private userService: UserService) { }

  init(): void {
    const inp = this.input.filter(messageFilter(msg => msg.from != null && this.userService.hasRole(msg.from!, 'kek')))
    inp.onText(/(^|\b)я\b\s?(.*\b)?урод($|\b)/, ({ message }) => this.api.reply(message, 'Ты красавчик!'))
    inp.onText(/(^|\b)я\b\s?(.*\b)?дебил($|\b)/, ({ message }) => this.api.reply(message, 'Ты гений!'))
    inp.onText(/(^|\b)я\b\s?(.*\b)?должен умереть($|\b)/, ({ message }) => this.api.reply(message, 'Живи сто лет!'))
    inp.onText(/(^|\b)я\b\s?(.*\b)?(лысый|лысею)($|\b)/, ({ message }) => this.api.reply(message, 'Ты красавчик!'))
    inp.onText(/(^|\b)я\b\s?(.*\b)?(азиат|монгол)($|\b)/, ({ message }) => this.api.reply(message, 'Ты русский!'))
  }
}
