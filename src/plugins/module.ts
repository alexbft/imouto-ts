import { provide } from 'core/di/provider';

import { HelloPlugin } from './src/hello';
import { HelpPlugin } from './src/help';
import { IdPlugin } from './src/id';
import { IqTestPlugin } from './src/iq_test';

export const pluginBindings = [
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin),
  provide(IqTestPlugin)
];
