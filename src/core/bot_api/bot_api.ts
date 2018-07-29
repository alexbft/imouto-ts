import * as moment from 'moment';
import { Message, Update, CallbackQuery } from 'node-telegram-bot-api';

import { Injector, Injectable } from 'core/di/injector';
import { logger } from 'core/logging/logger';
import * as msg from 'core/tg/message_util';
import { timeout } from 'core/util/promises';
import { pluginBindings } from 'plugins/module';

import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { TimeoutError } from 'rxjs/util/TimeoutError';
import { provide } from 'core/di/provider';
import { InputImpl } from 'core/bot_api/input_impl';
import { FilterFactory } from 'core/filter/filter_factory';

const pluginInitTimeout = moment.duration(30, 'seconds');

@Injectable
export class BotApi {
  private readonly inputImpl: InputImpl;
  private readonly startMoment: moment.Moment;

  constructor(private injector: Injector, private filters: FilterFactory) {
    this.inputImpl = new InputImpl();
    this.startMoment = moment();
  }

  async initPlugins(): Promise<void> {
    const input = this.inputImpl.input;
    input.installGlobalFilter(this.filters.isNotBanned(), 'User is banned');
    const pluginInjector = this.injector.subContext([...pluginBindings, provide(Input, { useValue: input })]);
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
  }

  onMessage(message: Message): void {
    logger.debug('Message:', message);
    if (this.isOldMessage(message)) {
      return;
    }
    this.inputImpl.handleMessage(message);
  }

  onCallbackQuery(query: CallbackQuery): void {
    logger.debug('Callback query:', query);
    this.inputImpl.handleCallbackQuery(query);
  }

  isOldMessage(message: Message): boolean {
    return msg.moment(message).add(5, 'minutes').isBefore(this.startMoment);
  }
}
