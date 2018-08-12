import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { botReference, fixMultiline, safeExecute, tryParseInt } from 'core/util/misc';
import { TextMatch } from 'core/bot_api/text_match';
import * as moment from 'moment';
import { jsParseDate } from 'vendor/date_parse';
import { fullName, messageToString } from 'core/tg/message_util';
import { Scheduler } from 'core/util/scheduler';
import { UserService } from 'core/tg/user_service';
import { Injectable } from 'core/di/injector';
import { parseNote } from 'core/util/date_parse_hack';
import { DatabaseFactory } from 'core/db/database_factory';
import { Database } from 'core/db/database';
import { Alarm, createTable, getAlarms, insertAlarm, disableAlarm } from 'plugins/src/alarm_clock_sql';

// TODO: time zone support

function showAlarm(alarm: Alarm): string {
  let date: string;
  if (alarm.date.year() === moment().year() && alarm.date.dayOfYear() === moment().dayOfYear()) {
    date = alarm.date.format('HH:mm:ss');
  } else if (alarm.date.year() === moment().year()) {
    date = alarm.date.format('LL').split(' ').slice(0, 2).join(' ') + ' ' + alarm.date.format('HH:mm');
  } else {
    date = alarm.date.format('LLL');
  }
  return fixMultiline(`
    ⏰ *${date}*
    _${alarm.message}_
    Отменить: /alarmoff${alarm.id}
  `);
}

@Injectable
export class AlarmClockPlugin implements BotPlugin {
  readonly name = 'Alarm clock';

  private readonly alarms = new Map<number, Alarm>();
  private readonly db: Database;

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    private readonly scheduler: Scheduler,
    private readonly userService: UserService,
    dbFactory: DatabaseFactory,
  ) {
    this.db = dbFactory.create();
  }

  async init(): Promise<void> {
    await this.db.open();
    await createTable(this.db);
    const alarms = await getAlarms(this.db);
    for (const alarm of alarms) {
      this.alarms.set(alarm.id, alarm);
      if (alarm.isEnabled) {
        this.scheduleAlarm(alarm);
      }
    }
    const regex = botReference(/^(?:(?:(bot),?\s*)|!\s?)(напомни|будильники?|alarms?|напоминани[яе])(?:\s+(.+))?$/);
    this.input.onText(regex, this.handleSetAlarm, (message) => this.api.reply(message, 'Будильник сломался :('));
    this.input.onText(/^\/alarmoff(\d+)/, this.handleStopAlarm, (message) => this.api.reply(message, 'Будильник сломался :('));
  }

  dispose = () => this.db.close();

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
      id: 0,
      chatId: message.chat.id,
      userId: user.id,
      userName: fullName(user),
      date: moment(date),
      isEnabled: true,
      hasFired: false,
      message: note
    };
    await this.addAlarm(alarm);
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
      return this.api.reply(message, 'Напоминание не найдено или недоступно. Вы можете отменить только свои напоминания.');
    }
    if (!alarm.isEnabled) {
      return this.api.reply(message, 'Это напоминание уже отменено.');
    }
    if (alarm.hasFired) {
      return this.api.reply(message, 'Это напоминание уже в прошлом.');
    }
    alarm.isEnabled = false;
    await disableAlarm(this.db, alarm.id);
    return this.api.reply(message, 'Напоминание отменено.');
  }

  private get allAlarms(): Alarm[] {
    return Array.from(this.alarms.values());
  }

  private async addAlarm(alarm: Alarm): Promise<void> {
    const id = await insertAlarm(this.db, alarm);
    alarm.id = id;
    this.scheduleAlarm(alarm);
  }

  private scheduleAlarm(alarm: Alarm): void {
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
