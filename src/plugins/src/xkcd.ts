import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { PropsOf, readJson, randomChoice, tryParseInt } from 'core/util/misc';
import { dataDir } from 'core/module/data_dir';
import { TextMatch } from 'core/bot_api/text_match';
import { Message } from 'node-telegram-bot-api';
import { Web } from 'core/util/web';
import { pager, PageResult } from 'core/tg/pager';

interface XkcdIssue {
  num: number;
  title: string;
  titleLowercase: string;
}

@Injectable
export class XkcdPlugin implements BotPlugin {
  readonly name = 'XKCD';

  private readonly titleMap = new Map<number, XkcdIssue>();
  private pageNumbers: number[] = [];

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    private readonly web: Web,
  ) { }

  async init(): Promise<void> {
    const titleMap: PropsOf<XkcdIssue> = await readJson(dataDir + 'xkcd_titles.json');
    for (const k in titleMap) {
      const v = titleMap[k]!;
      v.titleLowercase = v.title.toLowerCase();
      this.titleMap.set(v.num, v);
    }
    this.pageNumbers = Array.from(this.titleMap.keys());
    this.input.onText(/^!\s?xkcd\b(?:\s*(.+))?/, this.handle);
  }

  private handle = ({ message, match }: TextMatch) => {
    const query = match[1];
    if (query == null || query.trim() === '') {
      return this.show(message, randomChoice(this.pageNumbers));
    }
    const num = tryParseInt(query);
    if (num != null) {
      return this.show(message, num);
    }
    const queryLowercase = query.toLowerCase();
    for (const issue of this.titleMap.values()) {
      if (issue.titleLowercase === queryLowercase) {
        return this.show(message, issue.num);
      }
    }
    for (const issue of this.titleMap.values()) {
      if (issue.titleLowercase.includes(queryLowercase)) {
        return this.show(message, issue.num);
      }
    }
    return this.api.reply(message, 'Выпуск не найден.');
  }

  private show(message: Message, issueNum: number): Promise<any> {
    const startPage = this.pageNumbers.indexOf(issueNum);
    return pager(this.api, this.input, {
      chatId: message.chat.id,
      type: 'imageurl',
      startPage: startPage,
      numPages: this.pageNumbers.length,
      getPage: this.getPage,
      enableRandom: true,
    });
  }

  private getPage = async (index: number): Promise<PageResult> => {
    const num = this.pageNumbers[index];
    const issueData = await this.web.getJson(`https://xkcd.com/${num}/info.0.json`);
    return {
      url: issueData.img,
      caption: `${num}. ${issueData.title}\n\n${issueData.alt}`,
    };
  }
}
