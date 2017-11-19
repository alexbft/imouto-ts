import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Inject } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'node-telegram-bot-api';

@Inject
export class IdPlugin implements Plugin {
  public readonly name = 'ID';

  constructor(private api: TgApi) {}

  public init(input: Input) {
    input.onText(/^!id$/, this.onMessage);
  }

  public onMessage = (msg: Message) => {
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
