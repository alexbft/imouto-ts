import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { botReference, fixMultiline, safeExecute, tryParseInt } from 'core/util/misc';
import { TextMatch } from 'core/bot_api/text_match';
import { Moment } from 'moment';
import * as moment from 'moment';
import { jsParseDate } from 'vendor/date_parse';
import { fullName, messageToString } from 'core/tg/message_util';
import { Scheduler } from 'core/util/scheduler';
import { UserService } from 'core/tg/user_service';
import { Injectable } from 'core/di/injector';
import { parseNote } from 'core/util/date_parse_hack';

interface Alarm {
  id: number;
  isEnabled: boolean;
  hasFired: boolean;
  date: Moment;
  userId: number;
  userName: string;
  chatId: number;
  message: string;
}

function showAlarm(alarm: Alarm): string {
  return fixMultiline(`
    ⏰ *${alarm.date.format('LLL')}*
    _${alarm.message}_
    Отменить: /alarmoff${alarm.id}
  `);
}

// TODO: persistence

@Injectable
export class AlarmClockPlugin implements BotPlugin {
  readonly name = 'Alarm clock';

  private readonly alarms = new Map<number, Alarm>();
  private nextId: number = 1;

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    private readonly scheduler: Scheduler,
    private readonly userService: UserService,
  ) { }

  init(): void {
    const regex = botReference(/^(?:(?:(bot),?\s*)|!\s?)(напомни|будильники?|alarms?|напоминани[яе])(?:\s+(.+))?$/);
    this.input.onText(regex, this.handleSetAlarm, (message) => this.api.reply(message, 'Будильник сломался :('));
    this.input.onText(/^\/alarmoff(\d+)/, this.handleStopAlarm, (message) => this.api.reply(message, 'Будильник сломался :('));
  }

  private handleSetAlarm = async ({ message, match }: TextMatch): Promise<any> => {
    const query = match[3];
    const user = message.from!;
    if (query == null) {
      const alarms = this.allAlarms.filter(a => a.userId === user.id && a.isEnabled && !a.hasFired);
      if (alarms.length === 0) {
        return this.api.reply(message, 'Для вас напоминаний пока нет.');
      } else {
        return this.api.reply(message, fixMultiline(`
          Напоминания:

          ${alarms.map(showAlarm).join('\n\n')}
        `), { parse_mode: 'Markdown' });
      }
    }
    const date = jsParseDate(query).date;
    if (date == null) {
      return this.api.reply(message, 'Не могу разобрать дату.');
    }
    const note = message.reply_to_message != null ? messageToString(message.reply_to_message) : parseNote(query);
    const alarm: Alarm = {
      id: this.nextId++,
      chatId: message.chat.id,
      userId: user.id,
      userName: fullName(user),
      date: moment(date),
      isEnabled: true,
      hasFired: false,
      message: note
    };
    this.setAlarm(alarm);
    return this.api.reply(message,
      `Хорошо, я напомню вам об этом ${alarm.date.fromNow()}.\n\n${showAlarm(alarm)}`,
      { parse_mode: 'Markdown' });
  }

  private handleStopAlarm = async ({ message, match }: TextMatch): Promise<any> => {
    const query = match[1];
    const user = message.from!;
    const alarmId = tryParseInt(query);
    const alarm = alarmId != null ? this.alarms.get(alarmId) : null;
    const isAdmin = this.userService.hasRole(user, 'admin');
    if (alarm == null || (!isAdmin && alarm.userId !== user.id)) {
      return this.api.reply(message, 'Вы можете отменить только свои напоминания.');
    }
    if (!alarm.isEnabled) {
      return this.api.reply(message, 'Это напоминание уже отменено.');
    }
    if (alarm.hasFired) {
      return this.api.reply(message, 'Это напоминание уже в прошлом.');
    }
    alarm.isEnabled = false;
    return this.api.reply(message, 'Напоминание отменено.');
  }

  private get allAlarms(): Alarm[] {
    return Array.from(this.alarms.values());
  }

  private setAlarm(alarm: Alarm): void {
    this.alarms.set(alarm.id, alarm);
    this.scheduler.schedule(() => safeExecute(() => this.fireAlarm(alarm)), moment.duration(alarm.date.diff(moment())));
  }

  private fireAlarm(alarm: Alarm): Promise<any> {
    if (!alarm.isEnabled || alarm.hasFired) {
      return Promise.resolve();
    }
    alarm.hasFired = true;
    return this.api.sendMessage({
      chat_id: alarm.chatId,
      parse_mode: 'Markdown',
      text: fixMultiline(`
        ⏰⏰⏰
        *Внимание, *[${alarm.userName}](tg://user?id=${alarm.userId})*!*
        Напоминаю: _${alarm.message}_
      `)
    });
  }
}
