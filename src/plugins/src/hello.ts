import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';

@Injectable
export class HelloPlugin implements Plugin {
  readonly name = 'Hello';

  constructor(private tgApi: TgApi) {}

  init(input: Input): void {
    input.onText(/hello/, ({message}) => {
      this.tgApi.reply(message, `Hello ${message.from!.first_name}`);
    });
  }
}
