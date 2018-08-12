import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable, Inject } from 'core/di/injector';
import { wrapHandler, InputSource } from 'core/bot_api/input';
import { Message, User } from 'node-telegram-bot-api';
import { Unfiltered } from 'core/module/keys';
import { Database } from 'core/db/database';
import { DatabaseFactory } from 'core/db/database_factory';
import { Environment } from 'core/environment/environment';
import * as moment from 'moment';

@Injectable
export class UserCachePlugin implements BotPlugin {
  readonly name = 'User cache';

  private readonly db: Database;

  constructor(
    @Inject(Unfiltered)
    private readonly unfilteredInput: InputSource,
    factory: DatabaseFactory,
    private readonly environment: Environment,
  ) {
    this.db = factory.create();
  }

  async init(): Promise<void> {
    await this.db.open();
    return;
    await this.db.run(`
      create table if not exists user_names (
        user_id integer not null,
        first_name text not null,
        last_name text not null,
        username text not null,
        full_name text not null,
        message_count integer not null,
        last_message_date integer not null,
        primary key (user_id, first_name, last_name, username)
      );
    `);
    this.unfilteredInput.messages.subscribe(wrapHandler(this.handle));
  }

  dispose(): Promise<void> {
    return this.db.close();
  }

  handle = async (message: Message): Promise<void> => {
    if (message.from != null) {
      await this.save(message.from, message.date, 1);
    }
    if (message.forward_from != null) {
      await this.save(message.forward_from, message.forward_date!, 0);
    }
    if (message.reply_to_message != null) {
      const replyTo = message.reply_to_message;
      if (replyTo.from != null) {
        await this.save(replyTo.from, replyTo.date, 0);
      }
      if (replyTo.forward_from != null) {
        await this.save(replyTo.forward_from, replyTo.forward_date!, 0);
      }
    }
  }

  save(user: User, date: number, incCount: number): Promise<void> {
    date = moment.unix(date).valueOf();
    return this.environment.runCritical(async () => {
      const lastName = user.last_name || '';
      const username = user.username || '';
      const count = await this.db.get(`
        select count(*) c from user_names
        where user_id = ?
          and first_name = ?
          and last_name = ?
          and username = ?
      `, [user.id, user.first_name, lastName, username]);
      if (count.c === 0) {
        const fullName = user.last_name != null ? `${user.first_name} ${user.last_name}` : user.first_name;
        await this.db.run(`
          insert into user_names(user_id, first_name, last_name, username, full_name, message_count, last_message_date)
            values(?, ?, ?, ?, ?, ?, ?)
        `, [user.id, user.first_name, lastName, username, fullName, incCount, date]);
      } else {
        await this.db.run(`
          update user_names set
            message_count = message_count + ?,
            last_message_date = max(last_message_date, ?)
          where user_id = ?
            and first_name = ?
            and last_name = ?
            and username = ?
        `, [incCount, date, user.id, user.first_name, lastName, username]);
      }
    });
  }
}
