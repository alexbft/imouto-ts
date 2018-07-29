import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { Injectable } from 'core/di/injector';
import { TextMatch } from 'core/bot_api/text_match';
import { random, findAll } from 'core/util/misc';
import { AllHtmlEntities } from 'html-entities';
import * as iconv from 'iconv-lite';
import { Message } from 'node-telegram-bot-api';
import { InputMediaPhoto } from 'core/tg/tg_types';

// TODO: pager

@Injectable
export class NyashPlugin implements BotPlugin {
  readonly name = 'nya.sh';

  private readonly entities = new AllHtmlEntities();

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    private readonly web: Web
  ) { }

  init(): void {
    this.input.onText(/^!\s?няш(?:\s+(\d+))?\s*$/, this.sendPost, this.onError);
    this.input.onText(/^!\s?мяш(?:\s+(\d+))?\s*$/, this.sendPic, this.onError);
  }

  private sendPost = async ({ message, match }: TextMatch) => {
    const num = match[1] != null ? Number(match[1]) : random(8087) + 1;
    const page = await this.getPage(`http://nya.sh/post/${num}`);
    const text = this.entities.decode(page.match(/<div class="content">([^]+?)<\/div>/)![1].replace(/<br \/>/g, ''));
    return this.api.respondWithText(message, `Цитата №${num}\n\n${text}`);
  }

  private sendPic = async ({ message, match }: TextMatch) => {
    const num = match[1] != null ? Number(match[1]) : random(3404) + 1;
    const url = `http://nya.sh/pic/${num}`;
    const page = await this.getPage(url);
    const matches = findAll(page, /<img src="([^"]+?)" alt="pic" class="irl" \/>/g);
    if (matches.length === 0) {
      return this.api.reply(message, `Картинка ${url} не существует. Попробуй еще раз!`);
    }
    if (matches.length === 1) {
      const imageUrl = this.getImageUrl(matches[0]);
      return this.api.respondWithImageFromUrl(message, imageUrl, { caption: url });
    }
    const images: InputMediaPhoto[] = matches.map(match => ({
      type: 'photo',
      media: this.getImageUrl(match),
      caption: url
    } as InputMediaPhoto));
    return this.api.sendMediaGroup({
      chat_id: message.chat.id,
      media: images,
    });
  }

  private getImageUrl(match: RegExpExecArray): string {
    return 'http://nya.sh' + match[1];
  }

  private onError = (message: Message) => this.api.reply(message, 'Ошибка! Ньоро~н...');

  private async getPage(url: string): Promise<string> {
    const buf = await this.web.getBuffer(url);
    return iconv.decode(buf, 'win1251');
  }
}
