import * as _moment from 'moment';

import { Message, User } from 'node-telegram-bot-api';

export function moment(message: Message): _moment.Moment {
  return _moment.unix(message.date);
}

export const fullName = (user: User) =>
  user.last_name != null
    ? `${user.first_name} ${user.last_name}`
    : `${user.first_name}`;
