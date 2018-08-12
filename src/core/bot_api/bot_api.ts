import * as moment from 'moment';
import { Message, Update, CallbackQuery } from 'node-telegram-bot-api';

import { Injector, Injectable } from 'core/di/injector';
import { logger } from 'core/logging/logger';
import { timeout } from 'core/util/promises';
import { pluginBindings, allBindings } from 'plugins/module';

import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { TimeoutError } from 'rxjs/util/TimeoutError';
import { provide } from 'core/di/provider';
import { InputImpl } from 'core/bot_api/input_impl';
import { FilterFactory } from 'core/filter/filter_factory';
import { Unfiltered } from 'core/module/keys';
import { Environment } from 'core/environment/environment';
import { chatName, fullName, messageToString, isForwarded } from 'core/tg/message_util';

const pluginInitTimeout = moment.duration(30, 'seconds');

@Injectable
export class BotApi {
  private readonly inputImpl: InputImpl;
  private readonly startMoment: moment.Moment;

  constructor(
    private injector: Injector,
    private filters: FilterFactory,
    private readonly environment: Environment) {
    this.inputImpl = new InputImpl();
    this.startMoment = moment();
  }

  async initPlugins(): Promise<void> {
    const input = this.inputImpl.input;
    input.installGlobalFilter(this.filters.isNotBanned(), 'User is banned');
    const pluginInjector = this.injector.subContext([
      ...allBindings,
      provide(Input, { useValue: input }),
      provide(Unfiltered, { useValue: this.inputImpl }),
    ]);
    const initializers = [];
    let failed = 0;
    for (const provider of pluginBindings) {
      try {
        const plugin: BotPlugin = provider.get(pluginInjector);
        initializers.push(async () => {
          logger.info(`Initializing plugin: ${plugin.name}`);
          try {
            const initPromise = Promise.resolve(plugin.init());
            await timeout(initPromise, pluginInitTimeout);
            if (plugin.dispose != null) {
              this.environment.onDispose(() => plugin.dispose!());
            }
          } catch (e) {
            if (e instanceof TimeoutError) {
              logger.warn(`Plugin ${plugin.name} has timed out in initialization!`);
            } else {
              logger.warn(`Plugin ${plugin.name} has failed to initialize!`, e.stack || e);
            }
            failed++;
          }
        });
      } catch (e) {
        logger.warn(`Error in plugin provider: ${provider}`, e.stack || e);
        failed++;
      }
    }
    await Promise.all(initializers.map((fn) => fn()));
    if (failed === 0) {
      logger.info('All plugins initialized.');
    } else {
      logger.warn(`Some plugins failed (${failed}).`);
    }
  }

  onUpdate(update: Update): void {
    if (update.message != null) {
      this.onMessage(update.message);
    }
    if (update.callback_query != null) {
      this.onCallbackQuery(update.callback_query);
    }
    if (update.edited_message != null) {
      this.onEditedMessage(update.edited_message);
    }
  }

  private logMessage(message: Message, isEdited: boolean): void {
    const fromId = message.from != null ? message.from.id : null;
    const chatStr = fromId === message.chat.id ? 'private' : `${message.chat.id},${chatName(message.chat)}`;
    let name = message.from != null ? `${fromId},${fullName(message.from)}` : '';
    if (isForwarded(message)) {
      const forwardStr = message.forward_from != null ? `${message.forward_from.id},${fullName(message.forward_from)}` : `${chatName(message.forward_from_chat!)}`;
      name += `,from(${forwardStr})`;
    }
    logger.info(`[${message.message_id}${isEdited ? ',edit' : ',msg'}] [${chatStr}] [${name}] ${messageToString(message)}`);
  }

  onMessage(message: Message): void {
    this.logMessage(message, false);
    if (this.isOldMessage(message)) {
      logger.debug('Old message ignored');
      return;
    }
    this.inputImpl.handleMessage(message);
  }

  onCallbackQuery(query: CallbackQuery): void {
    logger.info(`[${query.id},callback] [${query.from.id},${fullName(query.from)}] ${query.data}`);
    this.inputImpl.handleCallbackQuery(query);
  }

  onEditedMessage(message: Message): void {
    this.logMessage(message, true);
  }

  isOldMessage(message: Message): boolean {
    return moment.unix(message.date).add(5, 'minutes').isBefore(this.startMoment);
  }
}
