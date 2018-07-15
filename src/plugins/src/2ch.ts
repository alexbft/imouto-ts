import { Plugin } from 'core/bot_api/plugin';
import { Input } from 'core/bot_api/input';
import * as cloudscraper from 'cloudscraper';
import { randomChoice } from 'core/util/misc';
import { TextMatch } from 'core/bot_api/text_match';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';

const HOST = '2ch.hk';
const BOARD = 'b';

function fetchWithCloudScraper(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudscraper.request({method: 'GET', url: url}, (error: any, _code: any, body: string) => {
      if (error != null) {
        reject(error);
      } else {
        resolve(JSON.parse(body));
      }
    });
  });
}

function fetchCatalog(): Promise<any> {
  return fetchWithCloudScraper(`https://${HOST}/${BOARD}/catalog.json`);
}

async function fetchThread(threadNum: any): Promise<any> {
  const result = await fetchWithCloudScraper(`https://${HOST}/${BOARD}/res/${threadNum}.json`);
  return result.threads[0];
}

function isGoodThread(thread: any): boolean {
  return thread.posts_count >= 50 && !thread.banned && !thread.closed;
}

function isBh(comment: string): boolean {
  return comment.indexOf('<br>@<br>') != -1;
}

function isBhThread(thread: any): boolean {
  const comment = thread.comment;
  return isBh(comment) || comment.toLowerCase().indexOf('бугурт') != -1;
}

function fixText(text: string): string {
  text = text
    .replace(/\<br\>/g, '\n')
    .replace(/\<span class="(.*?)"\>(.*?)\<\/span\>/g, '$2')
    .replace(/\<a.*?\<\/a\>/g, '');
  if (text.length > 1500) {
    text = text.substr(0, 1500);
  }
  return text;
}

function getPostText(post: any): string {
  let text = fixText(post.comment).trim();
  if (post.files.length > 0 && post.files[0].nsfw === 0) {
    text += `\n\nhttps://${HOST}${post.files[0].path}`;
  }
  return text;
}

function isGoodPost(post: any): boolean {
  return fixText(post.comment).trim().length >= 50;
}

async function randomBhThread(): Promise<any> {
  const catalog = await fetchCatalog();
  return randomChoice(catalog.threads.filter((t: any) => isGoodThread(t) && isBhThread(t)));
}

async function randomBhPost(threadNum: any): Promise<any> {
  const thread = await fetchThread(threadNum);
  return randomChoice(thread.posts.filter((p: any) => isBh(p.comment)));
}

async function randomThread(): Promise<any> {
  const catalog = await fetchCatalog();
  return randomChoice(catalog.threads.filter(isGoodThread));
}

async function randomPost(threadNum: any): Promise<any> {
  const thread = await fetchThread(threadNum);
  return randomChoice(thread.posts.filter(isGoodPost));
}

@Injectable
export class A2chPlugin implements Plugin {
  readonly name: string = '2ch';

  constructor(private api: TgApi) {}

  init(input: Input): void {
    input.onText(/^!\s?(кек|kek)/, this.onKek);
    input.onText(/^!\s?(сас|sas)/, this.onSas);
  }

  onKek = async ({message}: TextMatch): Promise<void> => {
    try {
      const thread = await randomBhThread();
      if (thread == null) {
        this.api.reply(message, 'В Багдаде всё спокойно!');
        return;
      }
      const post = await randomBhPost(thread.num);
      if (post == null) {
        this.api.reply(message, 'В Багдаде всё спокойно!');
        return;
      }
      this.api.sendMessage({
        chat_id: message.chat.id,
        text: getPostText(post),
        parse_mode: 'HTML'
      });
    } catch (e) {
      this.api.reply(message, 'ты кек');
    }
  }

  onSas = async ({message}: TextMatch): Promise<void> => {
    try {
      const thread = await randomThread();
      if (thread == null) {
        this.api.reply(message, 'Нет тредов');
        return;
      }
      const post = await randomPost(thread.num);
      if (post == null) {
        this.api.reply(message, 'В треде нет норм постов');
        return;
      }
      this.api.sendMessage({
        chat_id: message.chat.id,
        text: getPostText(post),
        parse_mode: 'HTML'
      });
    } catch (e) {
      this.api.reply(message, 'ты сас');
    }
  }
}
