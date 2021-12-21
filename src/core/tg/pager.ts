import { TgApi } from "core/tg/tg_api";
import { Input } from "core/bot_api/input";
import { PromiseOr } from "core/util/promises";
import { Subscription } from "rxjs";
import { InlineKeyboardMarkup, InlineKeyboardButton, Message, CallbackQuery, SendMessageOptions, SendPhotoOptions } from "node-telegram-bot-api";
import { SendMessageArgs, SendPhotoArgs, InputMediaPhoto } from "core/tg/tg_types";
import { logger } from "core/logging/logger";
import { random } from 'core/util/misc';

type UrlWithCaption = {
  url: string,
  caption?: string
};

export type PageResult = null | undefined | string | UrlWithCaption;

export interface PagerOptions {
  chatId?: number | string;
  replyToMessageId?: number;
  messageOptions?: SendMessageOptions | SendPhotoOptions,
  type?: 'text' | 'imageurl',
  startPage?: number,
  numPages?: number,
  prevCaption?: string,
  nextCaption?: string,
  randomCaption?: string,
  enableRandom?: boolean,
  getPage(index: number): PromiseOr<PageResult>,
}

const defaultPagerOptions = {
  startPage: 0,
  prevCaption: '⬅️ Назад',
  nextCaption: '➡️ Дальше',
  randomCaption: '🎲 Случайно',
  type: 'text',
  enableRandom: false,
};

const allPagers: Pager[] = [];
const maxPagers = 100;

export async function pager(tgApi: TgApi, input: Input, options: PagerOptions): Promise<Pager> {
  options = { ...defaultPagerOptions, ...options } as any;
  const result = new Pager(tgApi, input, options);
  allPagers.push(result);
  while (allPagers.length > maxPagers) {
    allPagers.shift()!.dispose();
  }
  await result.send();
  return result;
}

export function pagerReply(message: Message, tgApi: TgApi, input: Input, options: PagerOptions): Promise<Pager> {
  return pager(tgApi, input, {
    chatId: message.chat.id,
    replyToMessageId: message.message_id,
    ...options
  });
}

export class Pager {
  private index: number;
  private message?: Message;
  private callbackSubscription?: Subscription;
  private sendArgs: SendMessageArgs | SendPhotoArgs;

  constructor(private api: TgApi, private input: Input, private options: PagerOptions) {
    this.index = options.startPage!;
    if (options.type === 'text') {
      this.sendArgs = {
        chat_id: options.chatId!,
        reply_to_message_id: options.replyToMessageId,
        text: '',
        ...options.messageOptions,
      };
    } else {
      this.sendArgs = {
        chat_id: options.chatId!,
        reply_to_message_id: options.replyToMessageId,
        photo: '',
        ...options.messageOptions,
      }
    }
  }

  private sendMessage(args: SendMessageArgs | SendPhotoArgs): Promise<Message> {
    if (this.options.type === 'text') {
      return this.api.sendMessage(args as SendMessageArgs);
    } else {
      return this.api.sendPhoto(args as SendPhotoArgs);
    }
  }

  async send(): Promise<void> {
    const page = await this.getPage(this.index);
    if (page == null) {
      return;
    }
    const messageOptions = {
      ...this.sendArgs,
      reply_markup: this.getKeyboard(),
    };
    if (this.options.type === 'text') {
      (messageOptions as SendMessageArgs).text = String(page);
    } else {
      if (typeof page === 'object' && page.url != null) {
        (messageOptions as SendPhotoArgs).photo = page.url;
        (messageOptions as SendPhotoArgs).caption = page.caption;
      } else {
        (messageOptions as SendPhotoArgs).photo = String(page);
      }
    }
    if (this.options.numPages != null && this.options.numPages <= 1) {
      delete (messageOptions as any).reply_markup;
      await this.sendMessage(messageOptions);
      return;
    }
    this.message = await this.sendMessage(messageOptions);
    this.callbackSubscription = this.input.onCallback(this.message, this.handleCallback);
  }

  dispose(): void {
    if (this.callbackSubscription != null) {
      this.callbackSubscription.unsubscribe();
    }
  }

  private getPage(index: number): Promise<PageResult> {
    return Promise.resolve(this.options.getPage(index));
  }

  private getKeyboard(): InlineKeyboardMarkup {
    const keys: InlineKeyboardButton[] = [];
    if (this.index > 0) {
      keys.push({
        text: this.options.prevCaption!,
        callback_data: 'p',
      });
    }
    if (this.options.enableRandom! && this.options.numPages != null) {
      keys.push({
        text: this.options.randomCaption!,
        callback_data: 'r',
      });
    }
    if (this.options.numPages == null || this.index < this.options.numPages - 1) {
      keys.push({
        text: this.options.nextCaption!,
        callback_data: 'n',
      });
    }
    return { inline_keyboard: [keys] };
  }

  private handleCallback = async ({ id, data }: CallbackQuery) => {
    let newIndex: number;
    switch (data) {
      case 'n':
        newIndex = this.index + 1;
        break;
      case 'p':
        newIndex = this.index - 1;
        break;
      case 'r':
        newIndex = random(this.options.numPages!);
        break;
      default:
        throw new Error('Unknown key: ' + data);
    }
    const newPage = await this.getPage(newIndex);
    if (newPage == null) {
      return this.api.answerCallback(id, 'Не найдено');
    }
    this.index = newIndex;
    if (this.options.type === 'text') {
      await this.api.editMessageText({
        parse_mode: (this.sendArgs as SendMessageArgs).parse_mode,
        disable_web_page_preview: (this.sendArgs as SendMessageArgs).disable_web_page_preview,
        message_id: this.message!.message_id,
        chat_id: this.message!.chat.id,
        text: String(newPage),
        reply_markup: this.getKeyboard()
      });
    } else {
      let media: InputMediaPhoto;
      if (typeof newPage === 'object' && newPage.url != null) {
        media = {
          type: 'photo',
          media: newPage.url,
          caption: newPage.caption,
        };
      } else {
        media = {
          type: 'photo',
          media: String(newPage),
        };
      }
      try {
        await this.api.editMessageMedia({
          message_id: this.message!.message_id,
          chat_id: this.message!.chat.id,
          media,
          reply_markup: this.getKeyboard()
        });
      } catch (e: any) {
        logger.info('Sending image failed', e.message || e);
        await this.api.editMessageCaption({
          message_id: this.message!.message_id,
          chat_id: this.message!.chat.id,
          caption: `${media.caption} ${media.media}`,
          reply_markup: this.getKeyboard()
        });
      }
    }
    const answer = this.options.numPages != null ? `${this.index}/${this.options.numPages}` : `${this.index}`;
    return this.api.answerCallback(id, answer);
  }
}

