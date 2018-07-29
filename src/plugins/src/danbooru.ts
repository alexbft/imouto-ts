import { BotPlugin } from "core/bot_api/bot_plugin";
import { TgApi } from "core/tg/tg_api";
import { Injectable } from "core/di/injector";
import { Input } from "core/bot_api/input";
import { Message } from "node-telegram-bot-api";
import { Web } from "core/util/web";
import { Props } from "core/util/misc";
import { pager } from "core/tg/pager";

@Injectable
export class DanbooruPlugin implements BotPlugin {
  readonly name = 'Danbooru';

  constructor(
    private input: Input,
    private api: TgApi,
    private web: Web) { }

  init(): void {
    this.input.onText(/^!няша\s*$/, ({ message }) => this.handle(message), this.onError);
    this.input.onText(/^!няша\s+(.+)/, ({ message, match }) => this.handle(message, match[1]), this.onError);
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
      await pager(this.api, this.input, {
        chatId: message.chat.id,
        numPages: posts.length,
        type: 'imageurl',
        getPage: (index) => {
          const post = posts[index];
          return {
            url: post.file_url != null ? post.file_url : post.source,
            caption: `${post.tag_string_character} (${post.tag_string_copyright})`
          };
        }
      });
    }
  }

  private onError = (message: Message) =>
    this.api.reply(message, 'Рано тебе еще такое смотреть!');
}
