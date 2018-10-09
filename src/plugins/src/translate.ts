import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';

@Injectable
export class TranslatePlugin implements BotPlugin {
  readonly name = 'Translate';

  constructor(private input: Input, private api: TgApi, private web: Web) { }

  private async translate(
    src: string,
    dest: string,
    txt: string,
  ): Promise<string | null> {
    const res = await this.web.getAsBrowser(
      'http://translate.google.com/translate_a/single',
      {
        client: 's',
        ie: 'UTF-8',
        oe: 'UTF-8',
        sl: src,
        tl: dest,
        dt: 't',
        q: txt,
      },
    );

    try {
      const evalFn = new Function(`return ${res}`);
      const json: string[][] = evalFn();
      return json[0].map(d => d[0]).join('');
    } catch (e) {
      return null;
    }
  }

  init(): void {
    this.input.onText(
      /!(переведи|translate|перевод|расшифруй|tr)( [a-z]{2})?( [a-z]{2})?(?: ([^]+))?$/,
      this.onMessage,
      this.onError,
    );
  }

  onMessage = async ({ message, match }: TextMatch): Promise<void> => {
    let src: string;
    let dest: string;
    let text: string;

    if (match[2] != null && match[3] == null) {
      src = 'auto';
      dest = match[2].trim();
    } else {
      src = (match[2] || 'auto').trim();
      dest = (match[3] || 'ru').trim();
    }

    if (src === 'auto' && match[1].toLowerCase() === 'расшифруй') {
      src = 'ja';
    }

    if (match[4] !== null) {
      text = match[4].trim();
    } else if (message && message.reply_to_message && message.reply_to_message.text) {
      text = message.reply_to_message.text;
    } else {
      return;
    }

    const res = await this.translate(src, dest, text);
    if (res !== null) {
      await this.api.respondWithText(message, `Перевод: ${res}`);
    } else {
      await this.api.respondWithText(message, 'Сервис недоступен.');
    }
  }

  onError = (msg: Message) => this.api.reply(msg, 'Не понимаю я эти ваши иероглифы.');
}
