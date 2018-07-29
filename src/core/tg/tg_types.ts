import { SendMessageOptions, SendPhotoOptions, EditMessageTextOptions, InlineKeyboardMarkup, SendMediaGroupOptions } from "node-telegram-bot-api";
import { Stream } from "stream";

export interface SendMessageArgs extends SendMessageOptions {
  chat_id: number | string;
  text: string;
}

export interface SendPhotoArgs extends SendPhotoOptions {
  chat_id: number | string;
  photo: string | Stream | Buffer;
}

export interface EditMessageTextArgs extends EditMessageTextOptions {
  text: string;
}

export interface InputMediaPhoto {
  type: 'photo';
  media: string;
  caption?: string;
  parse_mode?: string;
}

export interface InputMediaVideo {
  type: 'video';
  media: string;
  thumb?: string;
  caption?: string;
  parse_mode?: string;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}

export type InputMedia = InputMediaPhoto | InputMediaVideo;

export interface EditMessageMediaArgs {
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  media: InputMedia;
  reply_markup?: InlineKeyboardMarkup;
}

export interface EditMessageCaptionArgs {
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  caption: string;
  parse_mode?: string;
  reply_markup?: InlineKeyboardMarkup;
}

export interface SendMediaGroupArgs extends SendMediaGroupOptions {
  chat_id: number | string;
  media: InputMedia[];
}
