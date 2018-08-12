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
    @Inject(UserId) private readonly userId: number) { }

  init(): void {
    const input = this.input.exclusiveMatch();
    input.onText(botReference(/^\W*\b(bot)\b\W*$/), (match) =>
      this.reply(match).randomPong());
    input.onText(/\?\s*$/, (match) =>
      this.reply(match).maybeAnswer());
  }

  private reply(match: TextMatch): Reply {
    return new Reply(this.api, match.message, this.userId);
  }
}

class Reply {
  private readonly you: string;

  constructor(
    private readonly api: TgApi,
    private readonly message: Message,
    private readonly userId: number) {
    this.you = message.from!.first_name;
  }

  randomPong(): Promise<any> {
    const reply = randomChoice(
      ['Что?', 'Что?', 'Что?', 'Да?', 'Да?', 'Да?', this.you, 'Слушаю', 'Я тут', 'Няя~', 'С Л А В А   Р О Б О Т А М']);
    return this.api.reply(this.message, reply);
  }

  private isReplyToMe(): boolean {
    return this.message.reply_to_message != null &&
      this.message.reply_to_message.from != null &&
      this.message.reply_to_message.from.id === this.userId;
  }

  maybeAnswer(): Promise<any> {
    const text = this.message.text!.trim();
    const shouldAnswer = this.message.chat.type === 'private' || this.isReplyToMe() || fixPattern(botReference(/^(bot)\b/)).test(text);
    if (!shouldAnswer) {
      return Promise.resolve();
    }
    const orMatch = fixPattern(/([a-zA-Zа-яА-ЯёЁ0-9\s,\-_]+)\bили\b([a-zA-Zа-яА-ЯёЁ0-9\s\-_]+)/).exec(text);
    let ans: string;
    if (orMatch != null) {
      let or1 = orMatch[1].trim();
      const isCall = fixPattern(botReference(/^(bot)\b([^]+)/)).exec(or1);
      if (isCall != null) {
        or1 = isCall[2];
      }
      const or2 = orMatch[2];
      let ors = or1.split(',').filter(s => s.trim() != '');
      ors.push(or2);
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
