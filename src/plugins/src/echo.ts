import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Message } from 'node-telegram-bot-api';
import { randomChoice } from 'core/util/misc';

@Injectable
export class EchoPlugin implements BotPlugin {
  readonly name = 'Echo';

  constructor(private input: Input, private tgApi: TgApi) { }

  init(): void {
    this.input.onText(/^!\s?(echo|скажи)\s+([^]+)/, ({ message, match }) => this.handle(message, match[2], { nya: false }));
    this.input.onText(/^!\s?ня\s+(.+)/, ({ message, match }) => this.handle(message, match[1], { nya: true }));
  }

  handle(message: Message, text: string, { nya }: { nya: boolean }): Promise<any> {
    text = text.trim();
    if (nya) {
      // Add nyans on punctuation.
      const nyan = randomChoice(['ня', 'ня', 'ня', 'ня', 'ня', 'ня', 'ня', 'десу', 'Карл']);
      text = text.replace(/([\!\?\.\,])/g, ` ${nyan}$1`);
      if (!/([\!\?\.\,])$/.test(text)) {
        text = text + ` ${nyan}!`;
      }
    }

    // Capitalize.
    let i = 0;
    while (i < text.length) {
      if (!'_*`['.includes(text.charAt(i))) {
        break;
      }
      i += 1;
    }
    if (i < text.length) {
      text = text.substr(0, i) + text.charAt(i).toUpperCase() + text.substr(i + 1);
    }

    if (/н[я]+$/i.test(text)) {
      text += ' ❤';
    }
    const parseMode = /\<\w+\>.*\<\/\w+\>/.test(text) ? 'HTML' : 'Markdown';
    return this.tgApi.respondWithText(message, text, { parse_mode: parseMode });
  }
}
