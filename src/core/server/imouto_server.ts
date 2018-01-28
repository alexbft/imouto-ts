import { Update } from 'node-telegram-bot-api';

import { logger } from 'core/logging/logger';
import { Injectable } from 'core/di/injector';
import { TgClient } from 'core/tg/tg_client';
import { Environment } from 'core/environment/environment';
import { BotApi } from 'core/bot_api/bot_api';

@Injectable
export class ImoutoServer {
  constructor(
      private readonly tgClient: TgClient,
      private readonly environment: Environment,
      private readonly botApi: BotApi) {}

  async start(): Promise<void> {
    logger.info('Starting...');
    process.on('unhandledRejection', this.onUnhandledRejection.bind(this));
    process.on('uncaughtException', this.onUncaughtException.bind(this));
    process.on('SIGINT', this.onSigInt.bind(this));
    await this.botApi.initPlugins();
    this.tgClient.updateStream.subscribe(this.onUpdate.bind(this));
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
