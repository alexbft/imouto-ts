import { Inject } from 'core/di/injector';
import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Message } from 'node-telegram-bot-api';
import { TgApi } from 'core/tg/tg_api';

@Inject
export class IdPlugin implements Plugin {
  readonly name = 'ID'

  constructor(private api: TgApi) {}

  init(input: Input) {
    input.onText(/^!id$/, this.onMessage)
  }

  onMessage = (msg: Message) => {
    if (msg.reply_to_message) {
      // TODO: add msgCache
      const tmp = msg.reply_to_message;
      if (tmp) {
        if (tmp.forward_from) {
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