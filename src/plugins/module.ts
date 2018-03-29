import { provide } from 'core/di/provider';

import { BashimPlugin } from './src/bashim';
import { HelloPlugin } from './src/hello';
import { HelpPlugin } from './src/help';
import { IdPlugin } from './src/id';
import { ImagesPlugin } from './src/images';
import { IqTestPlugin } from './src/iq_test';
import { TranslatePlugin } from './src/translate';

export const pluginBindings = [
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin),
  provide(IqTestPlugin),
  provide(BashimPlugin),
  provide(TranslatePlugin),
  provide(ImagesPlugin),
];
