import { Database } from 'core/db/database';
import { Moment } from 'moment';
import * as moment from 'moment';

export interface Alarm {
  id: number;
  isEnabled: boolean;
  hasFired: boolean;
  date: Moment;
  userId: number;
  userName: string;
  chatId: number;
  message: string;
}

interface AlarmRow {
  id: number;
  is_enabled: number;
  date: number;
  user_id: number;
  user_name: string;
  chat_id: number;
  message: string;
}

export async function createTable(db: Database): Promise<void> {
  await db.run(`
    create table if not exists alarms (
      id integer not null,
      is_enabled integer not null,
      date integer not null,
      user_id integer not null,
      user_name text not null,
      chat_id integer not null,
      message text not null,
      primary key (id)
    );
  `);
  await db.run(`
    create index if not exists idx_alarms_date
    on alarms (date);
  `);
}

export async function insertAlarm(db: Database, alarm: Alarm): Promise<number> {
  const result = await db.run(`
    insert into alarms (is_enabled, date, user_id, user_name, chat_id, message)
    values ($is_enabled, $date, $user_id, $user_name, $chat_id, $message);
  `, {
      $is_enabled: alarm.isEnabled ? 1 : 0,
      $date: alarm.date.valueOf(),
      $user_id: alarm.userId,
      $user_name: alarm.userName,
      $chat_id: alarm.chatId,
      $message: alarm.message
    });
  return result.lastID;
}

export async function getAlarms(db: Database): Promise<Alarm[]> {
  const now = Date.now();
  const rows = await db.all(`select * from alarms where date >= ?`, [now]);
  return rows.map((row: AlarmRow): Alarm => ({
    id: row.id,
    isEnabled: row.is_enabled == 1,
    date: moment(row.date),
    userId: row.user_id,
    userName: row.user_name,
    chatId: row.chat_id,
    message: row.message,
    hasFired: false
  }));
}

export async function disableAlarm(db: Database, alarmId: number): Promise<void> {
  await db.run('update alarms set is_enabled = 0 where id = ?', [alarmId]);
}
