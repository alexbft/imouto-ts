import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';

@Injectable
export class HelloPlugin implements BotPlugin {
  readonly name = 'Hello';

  constructor(private input: Input, private tgApi: TgApi) {}

  init(): void {
    this.input.onText(/hello/, ({message}) =>
        this.tgApi.reply(message, `Hello ${message.from!.first_name}`));
  }
}
