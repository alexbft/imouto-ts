import * as _moment from 'moment';

import { Message } from 'node-telegram-bot-api';

export function moment(message: Message): _moment.Moment {
  return _moment.unix(message.date);
}
