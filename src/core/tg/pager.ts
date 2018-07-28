import { TgApi, SendMessageArgs } from "core/tg/tg_api";
import { Input } from "core/bot_api/input";
import { PromiseOr } from "core/util/promises";
import { Subscription } from "rxjs";
import { InlineKeyboardMarkup, InlineKeyboardButton, Message, CallbackQuery, SendMessageOptions } from "node-telegram-bot-api";

type MaybeString = string | null | undefined;

export interface PagerOptions {
  chatId?: number | string;
  replyToMessageId?: number;
  messageOptions?: SendMessageOptions,
  startPage?: number,
  numPages?: number,
  prevCaption?: string,
  nextCaption?: string,
  getPage(index: number): PromiseOr<MaybeString>,
}

const defaultPagerOptions = {
  startPage: 0,
  prevCaption: 'Назад',
  nextCaption: 'Дальше',
};

const allPagers: Pager[] = [];
const maxPagers = 100;

export async function pager(tgApi: TgApi, input: Input, options: PagerOptions): Promise<Pager> {
  options = {...defaultPagerOptions, ...options};
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
  private sendMessageArgs: SendMessageArgs;

  constructor(private api: TgApi, private input: Input, private options: PagerOptions) {
    this.index = options.startPage!;
    this.sendMessageArgs = {
      chat_id: options.chatId!,
      reply_to_message_id: options.replyToMessageId,
      text: '',
      ...options.messageOptions,
    };
  }

  async send(): Promise<void> {
    const text = await this.getPage(this.index);
    if (text == null) {
      return;
    }
    const messageOptions = {
      ...this.sendMessageArgs,
      text: text,
      reply_markup: this.getKeyboard(),
    };
    if (this.options.numPages != null && this.options.numPages <= 1) {
      delete messageOptions.reply_markup;
      await this.api.sendMessage(messageOptions);
      return;
    }
    this.message = await this.api.sendMessage(messageOptions);
    this.callbackSubscription = this.input.onCallback(this.message, this.handleCallback);
  }

  dispose(): void {
    if (this.callbackSubscription != null) {
      this.callbackSubscription.unsubscribe();
    }
  }

  private getPage(index: number): Promise<MaybeString> {
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
    if (this.options.numPages == null || this.index < this.options.numPages - 1) {
      keys.push({
        text: this.options.nextCaption!,
        callback_data: 'n',
      });
    }
    return {inline_keyboard: [keys]};
  }

  private handleCallback = async ({id, data}: CallbackQuery) => {
    let newIndex: number;
    switch (data) {
      case 'n':
        newIndex = this.index + 1;
        break;
      case 'p':
        newIndex = this.index - 1;
        break;
      default:
        throw new Error('Unknown key: ' + data);
    }
    const newPage = await this.getPage(newIndex);
    if (newPage == null) {
      return this.api.answerCallback(id, 'Не найдено');
    }
    this.index = newIndex;
    await this.api.editMessageText({
      parse_mode: this.sendMessageArgs.parse_mode,
      disable_web_page_preview: this.sendMessageArgs.disable_web_page_preview,
      message_id: this.message!.message_id,
      chat_id: this.message!.chat.id,
      text: newPage,
      reply_markup: this.getKeyboard()
    });
    const answer = this.options.numPages != null ? `${this.index}/${this.options.numPages}` : `${this.index}`;
    return this.api.answerCallback(id, answer);
  }
}

