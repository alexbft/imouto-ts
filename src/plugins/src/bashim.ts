import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { Inject } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { AllHtmlEntities as Entities } from 'html-entities';
import * as iconv from 'iconv-lite';
import { Message } from 'node-telegram-bot-api';

const mapRandom = (page: string) => {
  const id = page.match(/bash.im\/quote\/(\d+)/)![1];
  const text = page.match(/0;">([^]+?)<\' \+ \'\/div>/)![1];
  return [
    id,
    text.replace(/<' \+ 'br>/g, '\n').replace(/<' \+ 'br \/>/g, '\n'),
  ];
};

const mapSpecific = (id: string) => (page: string) => {
  const decodedPage = iconv.decode(page as any, 'win1251');
  const text = decodedPage.match(/<div class="text">([^]+?)<\/div>/)![1];
  return [
    id,
    text.replace(/<br \/>/g, '\n').replace(/<br>/g, '\n'),
  ];
};

@Inject
export class BashimPlugin implements Plugin {
  readonly name = 'bash.im';

  constructor(
    private api: TgApi,
    private web: Web,
    private entities: Entities,
  ) {}

  init(input: Input) {
    input.onText(/^\!(баш|bash)\b[\s]*(\d+)?/, this.onMessage, this.onError);
  }

  onError = (msg: Message) => {
    this.api.sendMessage({
      chat_id: msg.chat.id,
      text: 'Баш уже не тот...',
    });
  }

  onMessage = async (msg: Message, match: RegExpExecArray) => {
    const id = match[2];
    const res = id == null
      ? this.web.getAsBrowser('http://bash.im/forweb/?u').then(mapRandom)
      : this.web.getAsBrowser(`http://bash.im/quote/${id}`).then(mapSpecific(id));

    const [quoteId, text] = await res;

    await this.api.sendMessage({
      chat_id: msg.chat.id,
      text: `Цитата №${quoteId}\n\n${this.entities.decode(text)}`,
    });
  }
}
