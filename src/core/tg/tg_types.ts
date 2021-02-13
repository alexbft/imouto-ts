import {
  SendMessageOptions,
  SendPhotoOptions,
  EditMessageTextOptions,
  InlineKeyboardMarkup,
  SendMediaGroupOptions,
  PhotoSize,
  EditMessageReplyMarkupOptions,
  ForwardMessageOptions
} from "node-telegram-bot-api";
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

export interface EditMessageReplyMarkupArgs extends EditMessageReplyMarkupOptions {
  reply_markup?: InlineKeyboardMarkup;
}

export interface SendMediaGroupArgs extends SendMediaGroupOptions {
  chat_id: number | string;
  media: InputMedia[];
}

export interface Animation {
  file_id: string;
  width: number;
  height: number;
  duration: number;
  thumb?: PhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface PassportData {
  data: EncryptedPassportElement[];
  credentials: EncryptedCredentials;
}

export interface EncryptedPassportElement {
  type: 'personal_details' | 'passport' | 'driver_license' | 'identity_card' | 'internal_passport' | 'address' | 'utility_bill' | 'bank_statement' | 'rental_agreement' | 'passport_registration' | 'temporary_registration' | 'phone_number' | 'email';
  data?: string;
  phone_number?: string;
  email?: string;
  files?: PassportFile[];
  front_side: PassportFile;
  reverse_side: PassportFile;
  selfie: PassportFile;
}

export interface PassportFile {
  file_id: string;
  file_size: number;
  file_date: number;
}

export interface EncryptedCredentials {
  data: string;
  hash: string;
  secret: string;
}

export { Message } from "node-telegram-bot-api";

export interface ForwardMessageArgs extends ForwardMessageOptions {
  chat_id: number | string;
  from_chat_id: number | string;
  message_id: number;
}

export interface DeleteMessageArgs {
  chat_id: number | string;
  message_id: number;
}
