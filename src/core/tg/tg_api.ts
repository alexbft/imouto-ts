import {
  EditMessageTextOptions,
  Message,
  SendMessageOptions,
} from 'node-telegram-bot-api';

import { Injectable } from 'core/di/injector';
import { TgClient } from './tg_client';

interface SendMessageArgs extends SendMessageOptions {
  chat_id: number | string;
  text: string;
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

  reply(message: Message, text: string): Promise<Message> {
    return this.sendMessage({
      chat_id: message.chat.id,
      text,
      reply_to_message_id: message.message_id,
    });
  }
}
