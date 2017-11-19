import { Injector } from 'core/di/injector';
import { TgClient } from './tg_client';

export class TgApi {
  private readonly tgClient: TgClient;

  constructor(injector: Injector) {
    this.tgClient = injector.get(TgClient);
  }

  async getMe(): Promise<string> {
    return JSON.stringify(await this.tgClient.send('getMe'));
  }
}
