import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Input } from 'core/bot_api/input';
import { TextMatch } from 'core/bot_api/text_match';
import { tryParseInt, random } from 'core/util/misc';
import { Message } from 'node-telegram-bot-api';

@Injectable
export class RollPlugin implements BotPlugin {
  readonly name = 'Dice roll';

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
  ) { }

  init(): void {
    this.input.onText(/^!\s*(roll|ролл)(?:\s+(d)?(\d+)\s*(?:(d|-)?\s*(\d+))?\s*)?$/, this.handle);
  }

  private handle = ({ message, match }: TextMatch) => {
    if (match[2] != null) {
      if (match[3] != null && match[4] == null && match[5] == null) {
        return this.rollDice(message, 1, tryParseInt(match[3]))
      }
      return Promise.resolve();
    } else if (match[3] == null) {
      return this.rollDice(message, 1, 20);
    } else if (match[4] != null && match[4].toLowerCase() === 'd') {
      return this.rollDice(message, tryParseInt(match[3]), tryParseInt(match[5]));
    } else if (match[5] != null) {
      return this.rollRandom(message, tryParseInt(match[3]), tryParseInt(match[5]));
    } else {
      return this.rollRandom(message, 1, tryParseInt(match[3]));
    }
  }

  private async rollDice(message: Message, num: number | null, faces: number | null): Promise<void> {
    if (num != null && num > 0 && faces != null && faces > 0) {
      if (num > 100) {
        await this.api.reply(message, 'Слишком много кубиков! У меня глаза разбегаются...');
        return;
      }
      const dices: number[] = [];
      for (let i = 0; i < num; ++i) {
        dices.push(random(faces) + 1);
      }
      const sum = dices.reduce((a, b) => a + b, 0);
      const text = num > 1 ? `${dices.join(' + ')} = ${sum} (${num}d${faces})` : `${sum} (d${faces})`;
      await this.api.reply(message, text);
    }
  }

  private async rollRandom(message: Message, a: number | null, b: number | null): Promise<void> {
    if (a != null && b != null && a < b) {
      const rnd = random(b - a + 1) + a;
      await this.api.reply(message, `${rnd} (${a}-${b})`);
    }
  }
}
