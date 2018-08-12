import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { DatabaseFactory } from 'core/db/database_factory';
import { Database } from 'core/db/database';
import { TextMatch } from 'core/bot_api/text_match';
import { Message } from 'node-telegram-bot-api';
import { UserInfo } from 'plugins/src/user/user_info';
import { fixMultiline, tryParseInt } from 'core/util/misc';
import { Injectable } from 'core/di/injector';
import * as moment from 'moment';

function name(row: UserInfo): string {
  return row.username != '' ? `${row.full_name} (@\u2063${row.username})` : row.full_name;
}

@Injectable
export class WhoPlugin implements BotPlugin {
  readonly name = 'User info';

  private readonly db: Database;

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    dbFactory: DatabaseFactory,
  ) {
    this.db = dbFactory.create();
  }

  async init(): Promise<void> {
    await this.db.open();
    this.input.onText(/^!\s?(who|кто)\b(?:\s*(.+))?/, this.handle, this.onError);
  }

  dispose(): Promise<void> {
    return this.db.close();
  }

  private handle = ({ message, match }: TextMatch) => {
    if (message.reply_to_message != null) {
      if (message.reply_to_message.from != null) {
        return this.searchById(message, message.reply_to_message.from.id);
      }
      return this.api.reply(message, 'Доктор Кто.');
    } else {
      if (match[2] == null || match[2].trim() === '') {
        return this.api.reply(message, 'Доктор Кто.');
      }
      return this.searchByText(message, match[2].trim());
    }
  }

  private async searchById(message: Message, userId: number): Promise<void> {
    const rows = await this.db.all(`
      select user_id, first_name, last_name, username, full_name, message_count, last_message_date
      from user_names
      where user_id = ?
    `, [userId]);
    if (rows.length === 0) {
      await this.api.reply(message, `Пользователь с id ${userId} не найден.`);
    } else {
      await this.api.reply(message, this.single(rows));
    }
  }

  private async searchByText(message: Message, text: string): Promise<void> {
    let rows: UserInfo[] | null = null;
    const id = tryParseInt(text);
    if (id != null) {
      rows = await this.db.all(`
        select user_id, first_name, last_name, username, full_name, message_count, last_message_date
        from user_names
        where user_id = ?
      `, [id]);
    }
    if (rows == null || rows.length === 0) {
      if (text.startsWith('@')) {
        rows = await this.db.all(`
          select user_id, first_name, last_name, username, full_name, message_count, last_message_date
          from user_names
          where username = ?
        `, [text.substr(1)]);
      } else {
        rows = await this.db.all(`
          select user_id, first_name, last_name, username, full_name, message_count, last_message_date
          from user_names
          where full_name like ?
        `, [`%${text}%`]);
      }
    }
    if (rows.length === 0) {
      await this.api.reply(message, `Пользователь не найден.`);
    } else if (rows.every(row => row.user_id === rows![0].user_id)) {
      await this.api.reply(message, this.single(rows));
    } else {
      await this.api.reply(message, this.multiple(rows));
    }
  }

  private single(rows: UserInfo[]): string {
    rows = rows.slice();
    const totalMessageCount = rows.map(row => row.message_count).reduce((a, b) => a + b, 0);
    rows.sort((a, b) => b.last_message_date - a.last_message_date);
    const main = rows[0];
    rows = rows.slice(1);
    rows.sort((a, b) => a.message_count - b.message_count);
    if (rows.length > 5) {
      rows = rows.slice(0, 5);
    }
    let aka: string;
    if (rows.length > 0) {
      aka = `Также известен(на) как: ${rows.map(name).join(', ')}`;
    } else {
      aka = '';
    }
    return fixMultiline(`
      Это ${name(main)}

      Сообщений: ${totalMessageCount}
      Последнее сообщение: ${moment().calendar(moment(main.last_message_date))}
      ${aka}
    `);
  }

  private multiple(rows: UserInfo[]): string {
    const m: Map<number, UserInfo> = new Map();
    for (const row of rows) {
      if (!m.has(row.user_id) || row.last_message_date > m.get(row.user_id)!.last_message_date) {
        m.set(row.user_id, row);
      }
    }
    return fixMultiline(`
      Найдены пользователи: ${m.size}

      ${ Array.from(m.values()).map(row => `${row.user_id} - ${name(row)}`).join('\n')}
    `);
  }

  private onError = (message: Message) => this.api.reply(message, 'Не знаю...');
}
