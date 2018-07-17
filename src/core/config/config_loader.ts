import * as PropertiesReader from 'properties-reader';
import { promisify } from 'util';
import * as fs from 'fs';

import { Provider, provide } from "core/di/provider";
import { logger } from 'core/logging/logger';

import { AuthToken } from "core/config/keys";
import { Injectable } from 'core/di/injector';

const configFileName = __dirname + '/../../../../config/main.config';

@Injectable
export class ConfigLoader {
  async load(): Promise<Provider[]> {
    logger.info('Reading configuration...');
    const exists = promisify(fs.exists);
    const readFile = promisify(fs.readFile);
    if (!await exists(configFileName)) {
      throw new Error('Configuration file not found: ' + configFileName);
    }
    const configText = await readFile(configFileName);
    const properties: PropertiesReader.Reader = (PropertiesReader as any)(null);
    properties.read(configText.toString());
    return [
      provide(AuthToken, { useValue: properties.get('token') })
    ];
  }
}
