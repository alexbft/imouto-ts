import { Injectable } from 'core/di/injector';
import { TgClient } from 'core/tg/tg_client';
import { SendMessageArgs, EditMessageTextArgs, EditMessageMediaArgs, SendPhotoArgs, EditMessageCaptionArgs } from 'core/tg/tg_types';
import { Message, AnswerCallbackQueryOptions, SendMessageOptions, SendPhotoOptions } from 'node-telegram-bot-api';

@Injectable
export class TgApi {
  constructor(private readonly tgClient: TgClient) { }

  async getMe(): Promise<string> {
    return JSON.stringify(await this.tgClient.send('getMe'));
  }

  sendMessage(args: SendMessageArgs): Promise<Message> {
    return this.tgClient.send('sendMessage', args);
  }

  editMessageText(args: EditMessageTextArgs): Promise<Message> {
    return this.tgClient.send('editMessageText', args);
  }

  editMessageMedia(args: EditMessageMediaArgs): Promise<Message> {
    return this.tgClient.send('editMessageMedia', args);
  }

  editMessageCaption(args: EditMessageCaptionArgs): Promise<Message> {
    return this.tgClient.send('editMessageCaption', args);
  }

  sendPhoto(args: SendPhotoArgs): Promise<Message> {
    // TODO: implement sending image from buffer or stream.
    return this.tgClient.send('sendPhoto', args);
  }

  answerCallbackQuery(args: AnswerCallbackQueryOptions): Promise<boolean> {
    return this.tgClient.send('answerCallbackQuery', args);
  }

  reply(message: Message, text: string): Promise<Message> {
    return this.sendMessage({
      chat_id: message.chat.id,
      text,
      reply_to_message_id: message.message_id,
    });
  }

  respondWithText(message: Message, text: string, options: SendMessageOptions = {}): Promise<Message> {
    return this.sendMessage({
      chat_id: message.chat.id,
      text,
      ...options
    });
  }

  replyWithImageFromUrl(message: Message, url: string, options: SendPhotoOptions = {}): Promise<Message> {
    return this.sendPhoto({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      photo: url,
      ...options
    });
  }

  respondWithImageFromUrl(message: Message, url: string, options: SendPhotoOptions = {}): Promise<Message> {
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
}
