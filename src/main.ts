import './path_hack';

import { Injector } from 'core/di/injector';
import { bindings as mainBindings } from 'core/module/main_module';
import { ConfigLoader } from 'core/config/config_loader';
import { ImoutoServer } from 'core/server/imouto_server';
import { logger } from 'core/logging/logger';
import * as moment from 'moment';

async function start(): Promise<void> {
  try {
    moment.locale('ru');

    const injector = new Injector(mainBindings);
    const configLoader: ConfigLoader = injector.get(ConfigLoader);
    const configBindings = await configLoader.load();
    const configuredInjector = injector.subContext(configBindings);
    const server: ImoutoServer = configuredInjector.get(ImoutoServer);
    await server.start();
  } catch (err) {
    logger.error(`Initialization error: `, err.stack || err, () => {
      process.exit();
    });
  }
}

start();
