import { provide } from 'core/di/provider';

import { HelloPlugin } from './src/hello';
import { HelpPlugin } from './src/help';
import { IdPlugin } from './src/id';

export const pluginBindings = [
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin)
];
