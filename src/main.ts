// Hack to resolve non-relative paths in Node.
process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

import { Injector } from 'core/di/injector';
import { mainBindings } from 'core/module/main_module';
import { ImoutoServer } from 'core/server/imouto_server';

function start(): void {
  const injector = new Injector(mainBindings);
  const server: ImoutoServer = injector.get(ImoutoServer);
  server.start();
}

start();
