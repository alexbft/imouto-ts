import { BotPlugin } from "core/bot_api/bot_plugin";
import { TgApi } from "core/tg/tg_api";
import { Injectable } from "core/di/injector";
import { Input } from "core/bot_api/input";
import { Message } from "node-telegram-bot-api";
import { Web } from "core/util/web";
import { Props, randomChoice } from "core/util/misc";

// TODO: send multi-result

@Injectable
export class DanbooruPlugin implements BotPlugin {
  readonly name = 'Danbooru';

  constructor(
      private input: Input,
      private api: TgApi,
      private web: Web) {}

  init(): void {
    this.input.onText(/^!няша\s*$/, ({message}) => this.handle(message), this.onError);
    this.input.onText(/^!няша\s+(.+)/, ({message, match}) => this.handle(message, match[1]), this.onError);
  }

  private async handle(message: Message, query?: string): Promise<void> {
    const options: Props = {
      'limit': 32
    };
    if (query != null) {
      options.tags = query;
    }
    const posts: any[] = await this.web.getJson('https://danbooru.donmai.us/posts.json', options);
    if (posts.length === 0) {
      await this.api.reply(message, 'Ничего не найдено!');
    } else {
      const post = randomChoice(posts);
      const url = post.large_file_url != null ? post.large_file_url : post.source;
      await this.api.respondWithImageFromUrl(message, url);
    }
  }

  private onError = (message: Message) =>
      this.api.reply(message, 'Рано тебе еще такое смотреть!');
}
