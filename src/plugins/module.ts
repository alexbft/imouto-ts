import { provide } from 'core/di/provider';

import { HelloPlugin } from './src/hello';

export const pluginBindings = [
  provide(HelloPlugin),
];
