import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'core/tg/tg_types';
import { TextMatch } from 'core/bot_api/text_match';
import * as mathjs from 'mathjs';
import { Injectable } from 'core/di/injector';
import { putIfAbsent } from 'core/util/misc';

@Injectable
export class MathPlugin implements BotPlugin {
  readonly name = 'MathJS';
  readonly parsers = new Map<number, mathjs.Parser>();

  constructor(
    private readonly input: Input,
    private readonly api: TgApi
  ) { }

  init(): void {
    this.input.onText(/^!\s?(калк|кальк|калькулятор|calc|math)\b\s*([^]+)$/, this.handle, this.onError);
    this.input.onText(/^(\$)\s*([^]+)$/, this.handle, this.onError);
  }

  handle = ({ message, match }: TextMatch) => {
    const from = message.from!.id;
    const parser = putIfAbsent(this.parsers, from, () => mathjs.parser());
    let result: any;
    try {
      result = parser.eval(match[2]);
    } catch (e) {
      return this.api.reply(message, `${e}`);
    }
    return this.api.reply(message, `${result}`);
  }

  onError = (msg: Message) => this.api.reply(msg, 'Поделила на ноль!');
}
