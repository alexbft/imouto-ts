import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable, Inject } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { randomChoice, fixPattern, botReference, capitalize } from 'core/util/misc';
import { UserId } from 'core/config/keys';

@Injectable
export class HelloPlugin implements BotPlugin {
  readonly name = 'Hello';

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    @Inject(UserId) readonly userId: number) { }

  init(): void {
    this.input.onText(/^!\s?выбор\s+([^]+)$/, (match) => this.reply(match).answer(match.match[1]));
  }

  private reply(match: TextMatch): Reply {
    return new Reply(this.api, match.message);
  }
}

class Reply {
  constructor(
    private readonly api: TgApi,
    private readonly message: Message) {
  }

  answer(query: string): Promise<any> {
    const text = query.trim();
    const orMatch = fixPattern(/([a-zA-Zа-яА-ЯёЁ0-9\s,\-_]+)\bили\b([a-zA-Zа-яА-ЯёЁ0-9\s\-_]+)/).exec(text);
    let ans: string;
    if (text.includes(',') || orMatch != null) {
      let ors: string[];
      if (orMatch != null) {
        let or1 = orMatch[1].trim();
        const isCall = fixPattern(botReference(/^(bot)\b([^]+)/)).exec(or1);
        if (isCall != null) {
          or1 = isCall[2];
        }
        const or2 = orMatch[2];
        ors = or1.split(',').filter(s => s.trim() != '');
        ors.push(or2);
      } else {
        ors = text.split(',').filter(s => s.trim() != '');
      }
      ors = ors.map(s => capitalize(s.trim()) + '.');
      ans = randomChoice(ors);
    } else {
      if (Math.random() < 0.5) {
        ans = randomChoice(['Да', 'Нет', 'Это не важно', 'Спок, бро', 'Толсто', 'Да, хотя зря', 'Никогда', '100%', '1 шанс из 100', 'Попробуй еще раз']);
      } else {
        ans = randomChoice(['Нет', 'Да', 'Вот это очень важно', 'Повод бить тревогу', 'Тонко', 'Нет, к счастью', 'Сегодня', '50 на 50', '99 из 100', 'Отстань, надоел']);
      }
    }
    return this.api.reply(this.message, ans);
  }
}
