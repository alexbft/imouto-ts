import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'core/tg/tg_types';
import { TextMatch } from 'core/bot_api/text_match';
import { Injectable } from 'core/di/injector';
import { pool, WorkerPool } from 'workerpool';

@Injectable
export class MathPlugin implements BotPlugin {
  readonly name = 'MathJS';
  private workers?: WorkerPool;
  private firstRun: boolean = true;

  constructor(
    private readonly input: Input,
    private readonly api: TgApi
  ) { }

  init(): void {
    this.workers = pool(__dirname + '/worker/mathjs_worker.js');

    this.input.onText(/^!\s?(калк|кальк|калькулятор|calc|math)\b\s*([^]+)$/, this.handle, this.onError);
    this.input.onText(/^(\$)\s*([^]+)$/, this.handle, this.onError);
  }

  handle = async ({ message, match }: TextMatch) => {
    const from = message.from!.id;
    let result: any;
    try {
      const work = this.workers!.exec('evalForUser', [from, match[2]]);
      if (this.firstRun) {
        this.firstRun = false;
        result = await work.timeout(15000);
      } else {
        result = await work.timeout(1000);
      }
    } catch (e) {
      return this.api.reply(message, `${e}`);
    }
    return this.api.reply(message, `${result}`);
  }

  onError = (msg: Message) => this.api.reply(msg, 'Поделила на ноль!');
}
