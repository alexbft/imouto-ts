import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable, Inject } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';
import { randomChoice, fixPattern, botReference, capitalize, replaceInPattern } from 'core/util/misc';
import { UserId } from 'core/config/keys';
//import { messageFilter } from 'core/filter/message_filter';

@Injectable
export class HelloPlugin implements BotPlugin {
  readonly name = 'Hello';

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    @Inject(UserId) readonly _userId: number) { }

  init(): void {
    const input = this.input.exclusiveMatch();
    const replaceTriggerAndBot = (r: RegExp) => replaceInPattern(botReference(r), '(trigger)',
      '(привет|пока|спасибо|спс|споки|спокойной ночи|как дела|глупая|глупый|тупая|тупой|дура|дурак|бака|умная|умный|умница|няша)');
    input.onText(botReference(/^\W*\b(bot)\b\W*$/), (match) =>
      this.reply(match).randomPong());
    input.onText(botReference(/^\W*(bot)\b[^]+\?\s*$/), (match) =>
      this.reply(match).answer());
    input.onText(replaceTriggerAndBot(/\b(trigger)\W+(ты\W+)?(bot)\b/), (match) =>
      this.reply(match).onTrigger(match.match[1]));
    input.onText(replaceTriggerAndBot(/\b(bot)\W+(ты\W+)?(trigger)\b/), (match) =>
      this.reply(match).onTrigger(match.match[3]));

    /*const filter = messageFilter(
      message => message.chat.type === 'private' ||
        (message.reply_to_message != null &&
          message.reply_to_message.from != null &&
          message.reply_to_message.from.id === this.userId));
    const privateInput = input.filter(filter);
    privateInput.onText(replaceTriggerAndBot(/\b(trigger)\b/), (match) =>
      this.reply(match).onTrigger(match.match[1]));
    privateInput.onText(/\?\s*$/, (match) => this.reply(match).answer());*/
  }

  private reply(match: TextMatch): Reply {
    return new Reply(this.api, match.message);
  }
}

class Reply {
  private readonly you: string;

  constructor(
    private readonly api: TgApi,
    private readonly message: Message) {
    this.you = message.from!.first_name;
  }

  randomPong(): Promise<any> {
    const reply = randomChoice(
      ['Что?', 'Что?', 'Что?', 'Да?', 'Да?', 'Да?', this.you, 'Слушаю', 'Я тут', 'Няя~', 'С Л А В А   Р О Б О Т А М']);
    return this.api.reply(this.message, reply);
  }

  answer(): Promise<any> {
    const text = this.message.text!.trim();
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

  onTrigger(trigger: string): Promise<any> {
    trigger = trigger.toLowerCase();
    const you = this.you;
    let reply: string;
    switch (trigger) {
      case 'привет':
      case 'прив':
        reply = `Привет, ${you}!`;
        break;
      case 'как дела':
        reply = randomChoice(['Хорошо!', 'Хорошо.', 'Плохо!', 'Плохо.', 'Как всегда.', 'А у тебя?', 'Чем занимаешься?', 'Я креветко', 'Истинно познавшие дзен не используют оценочных суждений.']);
        break;
      case 'пока':
        reply = `Пока, ${you}!`;
        break;
      case 'спасибо':
      case 'спс':
        reply = randomChoice([`Не за что, ${you}!`, `Пожалуйста, ${you}!`]);
        break;
      case 'споки':
      case 'спокойной ночи':
        const night = randomChoice(['Спокойной ночи', 'Сладких снов', 'До завтра']);
        reply = `${night}, ${you}!`;
        break;
      case 'глупая':
      case 'глупый':
        reply = 'Я не глупая!';
        break;
      case 'тупая':
      case 'тупой':
        reply = 'Я не тупая!';
        break;
      case 'дура':
      case 'дурак':
        reply = 'Я не дура!';
        break;
      case 'бака':
        reply = 'Я не бака!';
        break;
      case 'умная':
      case 'умный':
      case 'умница':
        reply = 'Да, я умная :3';
        break;
      case 'няша':
        reply = `Спасибо, ${you}, ты тоже няша!`;
        break;
      default:
        reply = 'Спасибо, не поняла!';
    }
    return this.api.reply(this.message, reply);
  }
}
