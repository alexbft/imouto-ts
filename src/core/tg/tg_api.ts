import { Injectable } from 'core/di/injector';
import { TgClient } from 'core/tg/tg_client';
import {
  SendMessageArgs,
  EditMessageTextArgs,
  EditMessageMediaArgs,
  SendPhotoArgs,
  EditMessageCaptionArgs,
  SendMediaGroupArgs,
  EditMessageReplyMarkupArgs,
  Message,
  ForwardMessageArgs,
  DeleteMessageArgs
} from 'core/tg/tg_types';
import {
  AnswerCallbackQueryOptions,
  SendMessageOptions,
  SendPhotoOptions,
  InlineKeyboardMarkup,
  EditMessageTextOptions
} from 'node-telegram-bot-api';
import { logger } from 'core/logging/logger';
import { logMessage } from 'core/tg/message_util';

@Injectable
export class TgApi {
  constructor(private readonly tgClient: TgClient) { }

  async sendMessage(args: SendMessageArgs): Promise<Message> {
    const result = await this.tgClient.send('sendMessage', args);
    logger.info(logMessage(result, { my: true }));
    return result;
  }

  editMessageText(args: EditMessageTextArgs): Promise<Message> {
    return this.tgClient.send('editMessageText', args);
  }

  editText(message: Message, text: string, options?: EditMessageTextOptions): Promise<Message> {
    return this.editMessageText({
      message_id: message.message_id,
      chat_id: message.chat.id,
      text,
      ...options
    });
  }

  editMessageMedia(args: EditMessageMediaArgs): Promise<Message> {
    if (args.media.caption != null && args.media.caption.length > 200) {
      args.media.caption = args.media.caption.substr(0, 200);
    }
    return this.tgClient.send('editMessageMedia', args);
  }

  editMessageCaption(args: EditMessageCaptionArgs): Promise<Message> {
    if (args.caption.length > 200) {
      args.caption = args.caption.substr(0, 200);
    }
    return this.tgClient.send('editMessageCaption', args);
  }

  editMessageReplyMarkup(args: EditMessageReplyMarkupArgs): Promise<Message> {
    return this.tgClient.send('editMessageReplyMarkup', args);
  }

  editReplyMarkup(message: Message, markup: InlineKeyboardMarkup): Promise<Message> {
    return this.editMessageReplyMarkup({
      message_id: message.message_id,
      chat_id: message.chat.id,
      reply_markup: markup
    });
  }

  async sendPhoto(args: SendPhotoArgs): Promise<Message> {
    // TODO: implement sending image from buffer or stream.
    if (args.caption != null && args.caption.length > 200) {
      args.caption = args.caption.substr(0, 200);
    }
    const result = await this.tgClient.send('sendPhoto', args);
    logMessage(result, { my: true });
    return result;
  }

  answerCallbackQuery(args: AnswerCallbackQueryOptions): Promise<boolean> {
    return this.tgClient.send('answerCallbackQuery', args);
  }

  async sendMediaGroup(args: SendMediaGroupArgs): Promise<Message[]> {
    for (const media of args.media) {
      if (media.caption != null && media.caption.length > 200) {
        media.caption = media.caption.substr(0, 200);
      }
    }
    const result = await this.tgClient.send('sendMediaGroup', args);
    for (const msg of result) {
      logMessage(msg, { my: true });
    }
    return result;
  }

  reply(message: Message, text: string, options?: SendMessageOptions): Promise<Message> {
    return this.sendMessage({
      chat_id: message.chat.id,
      text,
      reply_to_message_id: message.message_id,
      ...options
    });
  }

  respondWithText(message: Message, text: string, options?: SendMessageOptions): Promise<Message> {
    return this.sendMessage({
      chat_id: message.chat.id,
      text,
      ...options
    });
  }

  replyWithImageFromUrl(message: Message, url: string, options?: SendPhotoOptions): Promise<Message> {
    return this.sendPhoto({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      photo: url,
      ...options
    });
  }

  respondWithImageFromUrl(message: Message, url: string, options?: SendPhotoOptions): Promise<Message> {
    return this.sendPhoto({
      chat_id: message.chat.id,
      photo: url,
      ...options
    });
  }

  answerCallback(callbackId: string, text: string): Promise<boolean> {
    return this.answerCallbackQuery({
      callback_query_id: callbackId,
      text: text
    });
  }

  forwardMessage(args: ForwardMessageArgs): Promise<Message> {
    return this.tgClient.send('forwardMessage', args);
  }

  deleteMessage(args: DeleteMessageArgs): Promise<boolean> {
    return this.tgClient.send('deleteMessage', args);
  }

  delete(message: Message): Promise<boolean> {
    return this.deleteMessage({
      message_id: message.message_id,
      chat_id: message.chat.id
    });
  }
}
