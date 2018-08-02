import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { TextMatch } from 'core/bot_api/text_match';
import { pagerReply, PageResult } from 'core/tg/pager';
import { Props } from 'core/util/misc';
import { Message } from 'node-telegram-bot-api';
import { Inject, Injectable } from 'core/di/injector';
import { GoogleKey } from 'core/config/keys';

// TODO: do not log key

@Injectable
export class YouTubePlugin implements BotPlugin {
  readonly name = 'YouTube';

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    private readonly web: Web,
    @Inject(GoogleKey) private readonly googleKey: string,
  ) { }

  init(): void {
    this.input.onText(/^!\s?(youtube|video|yt|видео)\b(?:\s*(.+))?/, this.handle, this.onError);
  }

  private handle = async ({ message, match }: TextMatch) => {
    let query: string | undefined = match[2];
    if (query == null && message.reply_to_message != null) {
      query = message.reply_to_message.text;
    }
    if (query == null) {
      return this.api.reply(message, 'https://www.youtube.com/');
    }
    const { items, nextPageToken } = await this.search(query.trim());
    if (items.length === 0) {
      return this.api.reply(message, 'Ничего не найдено!');
    }
    return pagerReply(message, this.api, this.input, {
      type: 'text',
      getPage: this.getPage(items, query.trim(), nextPageToken)
    });
  }

  private onError = (message: Message) => this.api.reply(message, 'Видео закрыто Роскомнадзором.');

  private getPage(results: any[], query: string, nextPageToken?: string) {
    let hasMore: boolean = true;
    return async (index: number): Promise<PageResult> => {
      if (index >= results.length) {
        if (hasMore && nextPageToken != null) {
          const { items, nextPageToken: token } = await this.search(query, nextPageToken);
          if (items.length === 0) {
            hasMore = false;
            return null;
          }
          nextPageToken = token;
          results.push(...items);
        } else {
          return null;
        }
      }
      const result = results[index];
      if (result == null) {
        return null;
      }
      const url = `https://www.youtube.com/watch?v=${result.id.videoId}`;
      const title = result.snippet.title;
      return `${title}\n${url}`;
    }
  }

  private async search(query: string, nextPageToken?: string): Promise<{ items: any[], nextPageToken?: string }> {
    const args: Props = {
      part: 'snippet',
      type: 'video',
      maxResults: 8,
      q: query,
      key: this.googleKey,
    };
    if (nextPageToken != null) {
      args.pageToken = nextPageToken;
    }
    const data = await this.web.getJson('https://www.googleapis.com/youtube/v3/search', args);
    return {
      items: data.items || [],
      nextPageToken: data.nextPageToken
    };
  }
}
