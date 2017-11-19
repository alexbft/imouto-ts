import { Update } from 'node-telegram-bot-api';

import { logger } from 'core/logging/logger';
import { Injector } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { TgClient } from 'core/tg/tg_client';
import { Environment } from 'core/environment/environment';
import { BotApi } from 'core/bot_api/bot_api';

export class ImoutoServer {
  private readonly tgApi: TgApi;
  private readonly tgClient: TgClient;
  private readonly environment: Environment;
  private readonly botApi: BotApi;

  constructor(injector: Injector) {
    this.tgApi = injector.get(TgApi);
    this.tgClient = injector.get(TgClient);
    this.environment = injector.get(Environment);
    this.botApi = injector.get(BotApi);
  }

  async start(): Promise<void> {
    logger.info('Starting...');
    process.on('unhandledRejection', this.onUnhandledRejection.bind(this));
    process.on('uncaughtException', this.onUncaughtException.bind(this));
    process.on('SIGINT', this.onSigInt.bind(this));
    await this.botApi.initPlugins();
    this.tgClient.updateStream.observe(this.onUpdate.bind(this));
    const connection = this.tgClient.connect();
    logger.info('Ready.');
    await connection;
    logger.info('Finished.');
  }

  onUpdate(update: Update): void {
    this.botApi.onUpdate(update);
  }

  onUnhandledRejection(err: any, _: Promise<any>): void {
    logger.error(`Unhandled: `, err.stack || err, () => {
      process.exit();
    });
  }

  onUncaughtException(err: any): void {
    logger.error(`Uncaught: `, err.stack || err, () => {
      process.exit();
    });
  }

  async onSigInt(): Promise<void> {
    if (!this.environment.isDisposing) {
      logger.info('Starting cleanup...');
      this.environment.startDisposing();
    } else {
      logger.warn('Force quit.', () => {
        process.exit();
      });
    }
  }
}
