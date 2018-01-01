import { Update, Message } from 'node-telegram-bot-api';
import * as moment from 'moment';

import { Injector } from 'core/di/injector';
import { logger } from 'core/logging/logger';
import { timeout } from 'core/util/promises';
import { pluginBindings } from 'plugins/module';
import * as msg from 'core/tg/message_util';

import { InputImpl } from './input';
import { Plugin } from './plugin';
import { TimeoutError } from 'rxjs/util/TimeoutError';

const pluginInitTimeout = moment.duration(30, 'seconds');

export class BotApi {
  private input: InputImpl;
  private readonly startMoment: moment.Moment;

  constructor(private injector: Injector) {
    this.startMoment = moment();
  }

  async initPlugins(): Promise<void> {
    this.input = new InputImpl();
    const pluginInjector = this.injector.subContext(pluginBindings);
    let initializers = [];
    let failed = 0;
    for (let provider of pluginBindings) {
      try {
        const plugin: Plugin = provider.get(pluginInjector);
        initializers.push(async () => {
          logger.info(`Initializing plugin: ${plugin.name}`);
          try {
            const initPromise = Promise.resolve(plugin.init(this.input));
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
  }

  onMessage(message: Message): void {
    logger.debug('Message:', message);
    if (this.isOldMessage(message)) {
      return;
    }
    this.input.handleMessage(message);
  }

  isOldMessage(message: Message): boolean {
    return msg.moment(message).add(5, 'minutes').isBefore(this.startMoment);
  }
}
