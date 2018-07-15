import { provide } from 'core/di/provider';

import { BashimPlugin } from './src/bashim';
import { HelloPlugin } from './src/hello';
import { HelpPlugin } from './src/help';
import { IdPlugin } from './src/id';
// import { ImagesPlugin } from './src/images';
import { IqTestPlugin } from './src/iq_test';
import { TranslatePlugin } from './src/translate';
import { A2chPlugin } from 'plugins/src/2ch';

export const pluginBindings = [
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin),
  provide(IqTestPlugin),
  provide(BashimPlugin),
  provide(TranslatePlugin),
  // provide(ImagesPlugin),
  provide(A2chPlugin),
];
