import * as http from 'http';
import * as https from 'https';
import * as moment from 'moment';
import { Update } from 'node-telegram-bot-api';
import { Observable, Subject } from 'rxjs';

import { AuthToken } from 'core/config/keys';
import { Inject, Injectable } from 'core/di/injector';
import { Environment } from 'core/environment/environment';
import { logger } from 'core/logging/logger';
import { Props, pause } from 'core/util/misc';
import { Web } from 'core/util/web';

import { TgException } from 'core/tg/tg_exception';

const oldUpdatesLimit = 10;
const updatesLongPollingTimeout = moment.duration(300, 'seconds');
const updatesErrorDelay = moment.duration(10, 'seconds');

@Injectable
export class TgClient {
  private readonly updateSubject = new Subject<Update>();

  private lastUpdateId = -1;

  constructor(
      private readonly environment: Environment,
      private readonly web: Web,
      @Inject(AuthToken) private readonly authToken: string) {}

  public get updateStream(): Observable<Update> {
    return this.updateSubject;
  }

  connect(): Promise<void> {
    logger.info('Starting getUpdates loop...');
    return this.getUpdatesLoop();
  }

  send(methodName: string, args?: Props): Promise<any> {
    return args != null ? this.sendArgs(methodName, args) : this.sendNoArgs(methodName);
  }

  private async getUpdatesLoop(): Promise<void> {
    while (!this.environment.isDisposing) {
      await this.getUpdates();
    }
  }

  private async getUpdates(): Promise<void> {
    try {
      const args = {
        offset: this.lastUpdateId == -1 ? -1 * oldUpdatesLimit : this.lastUpdateId + 1,
        timeout: updatesLongPollingTimeout.asSeconds(),
        allowed_updates: ['message'],
      };
      const response = await this.sendArgsRaw('getUpdates', args, 'debug');
      if (response.ok) {
        this.processUpdates(response.result);
      } else {
        logger.error('getUpdates returned error:', response);
        if (response.parameters != null && response.parameters.retry_after != null) {
          await pause(
              moment.duration(response['parameters']['retry_after'], 'seconds'));
        } else {
          await pause(updatesErrorDelay);
        }
      }
    } catch (e) {
      logger.error('Exception in getUpdates:', e.stack || e);
      await pause(updatesErrorDelay);
    }
  }

  private processUpdates(updates: Update[]): void {
    for (const update of updates) {
      logger.debug('Received update:', update);
      if (update.update_id != null) {
        if (this.lastUpdateId < update.update_id) {
          this.lastUpdateId = update.update_id;
        }
      } else {
        logger.warn('Update doesn\'t have id:', update);
      }
      if (!this.environment.isDisposing) {
        this.updateSubject.next(update);
      }
    }
  }

  private async sendArgs(methodName: string, args: Props): Promise<any> {
    return this.getResult(await this.sendArgsRaw(methodName, args));
  }

  private sendArgsRaw(methodName: string, args: Props, logLevel = 'verbose'): Promise<any> {
    const argsJson = JSON.stringify(args);
    logger.log(logLevel, `Calling ${methodName} with args: ${argsJson}`);
    const request = this.makePostRequest(methodName);
    request.write(argsJson);
    return this.web.fetchJson(request);
  }

  private async sendNoArgs(methodName: string): Promise<any> {
    logger.verbose(`Calling ${methodName}`);
    const request = this.makeGetRequest(methodName);
    return this.getResult(await this.web.fetchJson(request));
  }

  private makePostRequest(methodName: string): http.ClientRequest {
    return https.request({
      host: 'api.telegram.org',
      method: 'POST',
      path: `/bot${this.authToken}/${methodName}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private makeGetRequest(methodName: string): http.ClientRequest {
    return https.request({
      host: 'api.telegram.org',
      method: 'GET',
      path: `/bot${this.authToken}/${methodName}`,
    });
  }

  private getResult(response: any): any {
    if (response['ok']) {
      logger.verbose(`Got result:`, response['result']);
      return response['result'];
    } else {
      throw new TgException(response['description'], response['parameters']);
    }
  }
}
