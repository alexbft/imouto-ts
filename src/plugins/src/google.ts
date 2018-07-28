import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { Injectable, Inject } from "core/di/injector";
import { TgApi } from "core/tg/tg_api";
import { Message } from "node-telegram-bot-api";
import { Web } from "core/util/web";
import { GoogleKey, GoogleCx } from "core/config/keys";
import { pagerReply } from "core/tg/pager";

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
    this.input.onText(/^!\s?(ищи|г|g|gg)(?:\s+([^]+))?/, this.handle, this.onError);
  }

  private handle = async ({message, match}: TextMatch): Promise<any> => {
    const cmd = match[1];
    var query: string | undefined = match[2];
    if (query == null && message.reply_to_message != null) {
      query = message.reply_to_message.text;
    }
    if (query == null) {
      return this.api.reply(message, 'Что искать?');
    }
    const results = await this.search(query, 0, 1);
    return pagerReply(message, this.api, this.input, {
      getPage: (page) => this.getPage(cmd, query!, results, page)
    });
  }

  private async getPage(cmd: string, query: string, results: any[], index: number): Promise<string | null> {
    if (index >= results.length) {
      const nextPage = await this.search(query, results.length, pageSize);
      results.push(...nextPage);
    }
    const result = results[index];
    if (result == null) {
      return null;
    }
    if (cmd === 'gg') {
      return `${result.titleNoFormatting}\n${result.link}`;
    } else {
      return `${result.link}`;
    }
  }

  private onError = (message: Message) => this.api.reply(message, 'Поиск не удался');

  private async search(query: string, start: number, num: number): Promise<any[]> {
    const result = await this.web.getJson('https://www.googleapis.com/customsearch/v1', {
      key: this.googleKey,
      cx: this.googleCx,
      gl: 'ru',
      hl: 'ru',
      start: start + 1,
      num,
      safe: 'off',
      q: query,
    });
    return result.items;
  }
}
