import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Inject } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';

@Inject
export class HelloPlugin implements Plugin {
  readonly name = 'Hello';

  constructor(private tgApi: TgApi) {}

  init(input: Input): void {
    input.onText(/hello/, (msg) => {
      this.tgApi.reply(msg, `Hello ${msg.from!.first_name}`);
    });
  }
}
