import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'node-telegram-bot-api';

@Injectable
export class IdPlugin implements BotPlugin {
  readonly name = 'ID';

  constructor(private input: Input, private api: TgApi) {}

  init(): void {
    this.input.onText(/^!id$/, ({message}) => this.onMessage(message));
  }

  onMessage = (msg: Message): Promise<any> => {
    if (msg.reply_to_message != null) {
      // TODO: add msgCache
      const tmp = msg.reply_to_message;
      if (tmp != null) {
        if (tmp.forward_from != null) {
          return this.api.reply(msg, `${tmp.forward_from.id}`);
        } else {
          return this.api.reply(msg, `${tmp.from!.id}`);
        }
      } else {
        return this.api.reply(msg, 'Нет данных...');
      }
    } else {
      return this.api.reply(msg, `${msg.from!.id}`);
    }
  }
}
