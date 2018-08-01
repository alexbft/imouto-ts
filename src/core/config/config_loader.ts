import * as PropertiesReader from 'properties-reader';

import { Provider, provide } from "core/di/provider";
import { logger } from 'core/logging/logger';
import { AuthToken, GoogleKey, GoogleCx, ExchangeKey, UserId, RoleMap, OpenWeatherMapKey } from "core/config/keys";
import { Injectable } from 'core/di/injector';
import { exists, readFile } from 'core/util/misc';

const configFileName = __dirname + '/../../../../config/main.config';

@Injectable
export class ConfigLoader {
  async load(): Promise<Provider[]> {
    logger.info('Reading configuration...');
    if (!await exists(configFileName)) {
      throw new Error('Configuration file not found: ' + configFileName);
    }
    const configText = await readFile(configFileName);
    const properties: PropertiesReader.Reader = (PropertiesReader as any)(null);
    properties.read(configText.toString());

    const authToken = properties.getRaw('token');
    if (authToken == null) {
      throw new Error('No auth token in configuration file');
    }
    const userId = Number(authToken.split(':')[0]);

    const roleMap: Map<string, number[]> = new Map();
    for (let key of Object.keys(properties.getAllProperties())) {
      if (key.startsWith('role_')) {
        roleMap.set(key.substr(5), this.getIdList(properties.getRaw(key)));
      }
    }

    return [
      provide(AuthToken, { useValue: authToken }),
      provide(UserId, { useValue: userId }),
      provide(GoogleKey, { useValue: properties.getRaw('googlekey') }),
      provide(GoogleCx, { useValue: properties.getRaw('googlecx') }),
      provide(ExchangeKey, { useValue: properties.getRaw('exchangekey') }),
      provide(RoleMap, { useValue: roleMap }),
      provide(OpenWeatherMapKey, { useValue: properties.getRaw('openweathermapkey') }),
    ];
  }

  private getIdList(s: string | null): number[] {
    if (s == null || s.trim() === '') {
      return [];
    }
    return s.split(',').map(s => parseInt(s.trim(), 10));
  }
}
