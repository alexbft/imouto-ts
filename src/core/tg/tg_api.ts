import {
  EditMessageTextOptions,
  Message,
  SendMessageOptions,
  SendPhotoOptions,
} from 'node-telegram-bot-api';

import { Injectable } from 'core/di/injector';
import { TgClient } from 'core/tg/tg_client';
import { Stream } from 'stream';

interface SendMessageArgs extends SendMessageOptions {
  chat_id: number | string;
  text: string;
}

interface SendPhotoArgs extends SendPhotoOptions {
  chat_id: number | string;
  photo: string | Stream | Buffer;
}

@Injectable
export class TgApi {
  constructor(private readonly tgClient: TgClient) {}

  async getMe(): Promise<string> {
    return JSON.stringify(await this.tgClient.send('getMe'));
  }

  sendMessage(args: SendMessageArgs): Promise<Message> {
    return this.tgClient.send('sendMessage', args);
  }

  editMessageText({ message_id, chat }: Message, text: string, args: EditMessageTextOptions): Promise<Message> {
    return this.tgClient.send('editMessageText', {
      chat_id: chat.id,
      message_id,
      text,
      ...args,
    });
  }

  sendPhoto(args: SendPhotoArgs): Promise<Message> {
    return this.tgClient.send('sendPhoto', args);
  }

  reply(message: Message, text: string): Promise<Message> {
    return this.sendMessage({
      chat_id: message.chat.id,
      text,
      reply_to_message_id: message.message_id,
    });
  }

  replyWithImageFromUrl(message: Message, url: string): Promise<Message> {
    return this.sendPhoto({
      chat_id: message.chat.id,
      reply_to_message_id: message.message_id,
      photo: url,
    });
  }
}
