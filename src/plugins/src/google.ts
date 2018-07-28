import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { Injectable, Inject } from "core/di/injector";
import { TgApi } from "core/tg/tg_api";
import { Message } from "node-telegram-bot-api";
import { Web, toUrl } from "core/util/web";
import { GoogleKey, GoogleCx } from "core/config/keys";
import { pagerReply, PageResult } from "core/tg/pager";

const pageSize = 8;

@Injectable
export class GooglePlugin implements BotPlugin {
  readonly name = 'Google';

  constructor(
      private input: Input,
      private api: TgApi,
      private web: Web,
      @Inject(GoogleKey) private googleKey: string,
      @Inject(GoogleCx) private googleCx: string) {}

  init(): void {
    this.input.onText(/^!\s?(ищи|г|g|gg)(?:\s+([^]+))?$/, (match) => this.handle(match, 'web'), this.onError);
    this.input.onText(/^!\s?(покажи|пик|pic|img|фото)(?:\s+([^]+))?$/, (match) => this.handle(match, 'image'), this.onError);
  }

  private handle = async ({message, match}: TextMatch, type: 'web'|'image'): Promise<any> => {
    const cmd = match[1];
    var query: string | undefined = match[2];
    if (query == null && message.reply_to_message != null) {
      query = message.reply_to_message.text;
    }
    if (query == null) {
      return this.api.reply(message, 'Что искать?');
    }
    const results = await this.search(query, 0, 1, type);
    return pagerReply(message, this.api, this.input, {
      type: type === 'web' ? 'text' : 'imageurl',
      getPage: (index) => this.getPage(cmd, type, query!, results, index)
    });
  }

  private async getPage(cmd: string, type: 'web'|'image', query: string, results: any[], index: number): Promise<PageResult> {
    if (index >= results.length) {
      const nextPage = await this.search(query, results.length, pageSize, type);
      results.push(...nextPage);
    }
    const result = results[index];
    if (result == null) {
      return null;
    }
    if (type === 'web') {
      if (cmd === 'gg') {
        return `${result.title}\n${result.link}`;
      } else {
        return `${result.link}`;
      }
    } else {
      var link: string = result.link.toString().toLowerCase();
      var url: string;
      if (!(link.endsWith('jpg') || link.endsWith('jpeg') || link.endsWith('png'))) {
        url = result.image.thumbnailLink;
      } else {
        url = result.link;
      }
      return {
        caption: result.title,
        url: url
      };
    }
  }

  private onError = (message: Message) => this.api.reply(message, 'Поиск не удался');

  private async search(query: string, start: number, num: number, type: 'web'|'image'): Promise<any[]> {
    const url = toUrl('https://www.googleapis.com/customsearch/v1', {
      key: this.googleKey,
      cx: this.googleCx,
      gl: 'ru',
      hl: 'ru',
      start: start + 1,
      num,
      safe: type === 'web' ? 'off' : 'high',
      q: query,
      searchType: type === 'web' ? null : 'image',
    });
    const result = await this.web.getJson(url);
    return result.items;
  }
}
