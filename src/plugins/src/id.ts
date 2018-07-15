import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'node-telegram-bot-api';

@Injectable
export class IdPlugin implements Plugin {
  readonly name = 'ID';

  constructor(private api: TgApi) {}

  init(input: Input): void {
    input.onText(/^!id$/, ({message}) => this.onMessage(message));
  }

  onMessage = (msg: Message): void => {
    if (msg.reply_to_message != null) {
      // TODO: add msgCache
      const tmp = msg.reply_to_message;
      if (tmp != null) {
        if (tmp.forward_from != null) {
          this.api.reply(msg, `${tmp.forward_from.id}`);
        } else {
          this.api.reply(msg, `${tmp.from!.id}`);
        }
      } else {
        this.api.reply(msg, 'Нет данных...');
      }
    } else {
      this.api.reply(msg, `${msg.from!.id}`);
    }
  }
}
