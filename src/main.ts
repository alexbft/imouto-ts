// Hack to resolve non-relative paths in Node.
process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

import { Injector } from 'core/di/injector';
import { bindings as mainBindings } from 'core/module/main_module';
import { ConfigLoader } from 'core/config/config_loader';
import { ImoutoServer } from 'core/server/imouto_server';
import { logger } from 'core/logging/logger';

async function start(): Promise<void> {
  try {
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
