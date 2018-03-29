import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { Message } from 'node-telegram-bot-api';

@Injectable
export class TranslatePlugin implements Plugin {
  readonly name = 'Translate';

  constructor(private api: TgApi, private web: Web) {}

  async translate(
    src: string,
    dest: string,
    txt: string,
  ): Promise<string | null> {
    const res = await this.web.getAsBrowser(
      'http://translate.google.com/translate_a/single',
      {
        qs: {
          client: 's',
          ie: 'UTF-8',
          oe: 'UTF-8',
          sl: src,
          tl: dest,
          dt: 't',
          q: txt,
        },
      },
    );

    try {
      console.log(res);
      const evalFn = new Function(`return ${res}`);
      const json: string[][] = evalFn();
      return json[0].map(d => d[0]).join('');
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  init(input: Input): void {
    input.onText(
      /!(переведи|translate|перевод|расшифруй|tr)( [a-z]{2})?( [a-z]{2})?(?: ([^]+))?$/,
      this.onMessage,
    );
  }

  onMessage = async (msg: Message, match: RegExpMatchArray): Promise<void> => {
    try {
      let src: string;
      let dest: string;
      let text: string;

      if (match[2] != null && match[3] == null) {
        src = 'auto';
        dest = match[2].trim();
      } else {
        src = (match[2] && 'auto').trim();
        dest = (match[3] && 'ru').trim();
      }

      if (src === 'auto' && match[1].toLowerCase() === 'расшифруй') {
        src = 'ja';
      }

      if (match[4] !== null) {
        text = match[4].trim();
      } else if (msg && msg.reply_to_message && msg.reply_to_message.text) {
        text = msg.reply_to_message.text;
      } else {
        return;
      }

      const res = await this.translate(src, dest, text);
      if (res !== null) {
        this.api.sendMessage({
          chat_id: msg.chat.id,
          text: `Перевод: ${res}`,
        });
      } else {
        this.api.sendMessage({
          chat_id: msg.chat.id,
          text: 'Сервис недоступен.',
        });
      }
    } catch (e) {
      this.onError(msg);
    }
  }

  onError = (msg: Message): void => {
    this.api.sendMessage({
      chat_id: msg.chat.id,
      text: 'Не понимаю я эти ваши иероглифы.',
    });
  }
}
