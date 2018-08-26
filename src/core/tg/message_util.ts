import { User, Chat, Contact } from 'node-telegram-bot-api';
import { Message } from 'core/tg/tg_types';

export function fullName(user: User): string {
  return user.last_name != null
    ? `${user.first_name} ${user.last_name}`
    : `${user.first_name}`;
}

export function fullContactName(contact: Contact): string {
  return contact.last_name != null
    ? `${contact.first_name} ${contact.last_name}`
    : `${contact.first_name}`;
}

export function original(message: Message): Message {
  return message.reply_to_message != null ? message.reply_to_message : message;
}

export function chatName(chat: Chat): string {
  if (chat.title != null) {
    return chat.title;
  }
  return chat.last_name != null
    ? `${chat.first_name} ${chat.last_name}`
    : `${chat.first_name}`;
}

export function isForwarded(message: Message): boolean {
  return message.forward_from != null || message.forward_from_chat != null;
}

export function isPrivate(message: Message): boolean {
  return message.chat.type === 'private';
}

export function messageToString(message: Message): string {
  const maybe = (s?: string) => s != null ? ` ${s}` : '';
  const maybeCaption = maybe(message.caption);
  if (message.text != null) {
    return message.text;
  }
  if (message.audio != null) {
    return '[Аудио]' + maybeCaption;
  }
  if (message.animation != null) {
    return '[GIF]' + maybeCaption;
  }
  if (message.game != null) {
    return `[Игра] ${message.game.title}`;
  }
  if (message.photo != null) {
    return '[Изображение]' + maybeCaption;
  }
  if (message.sticker != null) {
    return '[Стикер]' + maybe(message.sticker.emoji) + maybe(message.sticker.set_name);
  }
  if (message.video != null) {
    return '[Видео]' + maybeCaption;
  }
  if (message.voice != null) {
    return '[Голосовое сообщение]' + maybeCaption;
  }
  if (message.video_note != null) {
    return '[Видеозапись]';
  }
  if (message.contact != null) {
    return '[Контакт] ' + fullContactName(message.contact);
  }
  if (message.location != null) {
    const location = message.location;
    return `[Локация] Широта: ${location.latitude.toFixed(6)} Долгота: ${location.longitude.toFixed(6)}`;
  }
  if (message.venue != null) {
    return `[Место] ${message.venue.title}`;
  }
  if (message.document != null) {
    return `[Документ]` + maybe(message.document.file_name);
  }
  if (message.new_chat_members != null) {
    return `[Пользователь вошёл в чат] ${message.new_chat_members.map(fullName).join(', ')}`;
  }
  if (message.left_chat_member != null) {
    return `[Пользователь покинул чат] ${fullName(message.left_chat_member)}`;
  }
  if (message.new_chat_title != null) {
    return `[Новое название чата] ${message.new_chat_title}`;
  }
  if (message.new_chat_photo != null) {
    return `[Новая картинка чата]`;
  }
  if (message.delete_chat_photo != null) {
    return `[Картинка чата удалена]`;
  }
  if (message.group_chat_created != null) {
    return `[Чат создан]`;
  }
  if (message.supergroup_chat_created != null) {
    return `[Чат преобразован в супергруппу]`;
  }
  if (message.channel_chat_created != null) {
    return `[Создан канал]`;
  }
  if (message.pinned_message != null) {
    return `[Прикреплено] ` + messageToString(message.pinned_message);
  }
  if (message.invoice != null) {
    return `[Счёт] ${message.invoice.title}`;
  }
  if (message.successful_payment != null) {
    return `[Платёж]`;
  }
  if (message.connected_website != null) {
    return `[Вход на сайт] ${message.connected_website}`;
  }
  if (message.passport_data != null) {
    return `[Паспортные данные]`;
  }
  return '[Неизвестный тип сообщения]';
}

interface LogMessageOptions {
  isEdited?: boolean;
  my?: boolean;
}

export function logMessage(message: Message, options?: LogMessageOptions): string {
  options = { isEdited: false, my: false, ...options };
  const fromId = message.from != null ? message.from.id : null;
  const chatStr = fromId === message.chat.id ? 'private' : `${message.chat.id},${chatName(message.chat)}`;
  let name = options.my ? 'out' : (message.from != null ? `${fromId},${fullName(message.from)}` : '');
  if (isForwarded(message)) {
    const forwardStr = message.forward_from != null ? `${message.forward_from.id},${fullName(message.forward_from)}` : `${chatName(message.forward_from_chat!)}`;
    name += `,from(${forwardStr})`;
  }
  return `[${message.message_id}${options.isEdited ? ',edit' : ',msg'}] [${chatStr}] [${name}] ${messageToString(message)}`;
}
