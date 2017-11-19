import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Injector } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';

export class HelloPlugin implements Plugin {
  private readonly tgApi: TgApi;

  readonly name = 'Hello';

  constructor(injector: Injector) {
    this.tgApi = injector.get(TgApi);
  }

  init(input: Input): void {
    input.onText(/hello/, (msg) => {
      this.tgApi.reply(msg, `Hello ${msg.from!.first_name}`);
    });
  }
}
