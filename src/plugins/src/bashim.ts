import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { AllHtmlEntities as Entities } from 'html-entities';
import * as iconv from 'iconv-lite';
import { Message } from 'node-telegram-bot-api';

function mapRandom(page: string): string[] {
  const id = page.match(/bash.im\/quote\/(\d+)/)![1];
  const text = page.match(/0;">([^]+?)<\' \+ \'\/div>/)![1];
  return [
    id,
    text.replace(/<' \+ 'br>/g, '\n').replace(/<' \+ 'br \/>/g, '\n'),
  ];
}

function mapSpecific(id: string, page: string): string[] {
  const decodedPage = iconv.decode(page as any, 'win1251');
  const text = decodedPage.match(/<div class="text">([^]+?)<\/div>/)![1];
  return [id, text.replace(/<br \/>/g, '\n').replace(/<br>/g, '\n')];
}

@Injectable
export class BashimPlugin implements Plugin {
  readonly name = 'bash.im';

  constructor(
    private api: TgApi,
    private web: Web,
    private entities: Entities,
  ) {}

  init(input: Input): void {
    input.onText(/^\!(баш|bash)\b[\s]*(\d+)?/, this.onMessage);
  }

  onError = (msg: Message): void => {
    this.api.sendMessage({
      chat_id: msg.chat.id,
      text: 'Баш уже не тот...',
    });
  };

  onMessage = async (msg: Message, match: RegExpExecArray): Promise<void> => {
    try {
      const id = match[2];
      const [quoteId, text] =
        id == null
          ? mapRandom(await this.web.getAsBrowser('http://bash.im/forweb/?u'))
          : mapSpecific(
              id,
              await this.web.getAsBrowser(`http://bash.im/quote/${id}`),
            );

      await this.api.sendMessage({
        chat_id: msg.chat.id,
        text: `Цитата №${quoteId}\n\n${this.entities.decode(text)}`,
      });
    } catch (e) {
      this.onError(msg);
    }
  };
}
