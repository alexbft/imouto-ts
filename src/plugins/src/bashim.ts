import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { AllHtmlEntities as Entities } from 'html-entities';
import * as iconv from 'iconv-lite';
import { Message } from 'node-telegram-bot-api';
import { TextMatch } from 'core/bot_api/text_match';

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
export class BashimPlugin implements BotPlugin {
  readonly name = 'bash.im';
  private readonly entities = new Entities();

  constructor(
    private api: TgApi,
    private web: Web,
  ) {}

  init(input: Input): void {
    input.onText(/^\!\s?(баш|bash)\b[\s]*(\d+)?/, this.onMessage, this.onError);
  }

  onError = (msg: Message) =>
      this.api.respondWithText(msg, 'Баш уже не тот...');

  onMessage = async ({message, match}: TextMatch): Promise<void> => {
    const id = match[2];
    const [quoteId, text] =
      id == null
        ? mapRandom(await this.web.getAsBrowser('http://bash.im/forweb/?u'))
        : mapSpecific(
            id,
            await this.web.getAsBrowser(`http://bash.im/quote/${id}`),
          );

    await this.api.respondWithText(message, `Цитата №${quoteId}\n\n${this.entities.decode(text)}`);
  };
}
