import { provide } from 'core/di/provider';

import { HelloPlugin } from './src/hello';
import { HelpPlugin } from './src/help';

export const pluginBindings = [
  provide(HelloPlugin),
  provide(HelpPlugin),
];
