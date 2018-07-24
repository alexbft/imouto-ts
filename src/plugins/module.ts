import { provide } from 'core/di/provider';

import { BashimPlugin } from 'plugins/src/bashim';
import { HelloPlugin } from 'plugins/src/hello';
import { HelpPlugin } from 'plugins/src/help';
import { IdPlugin } from 'plugins/src/id';
// import { ImagesPlugin } from './src/images';
import { IqTestPlugin } from 'plugins/src/iq_test';
import { TranslatePlugin } from 'plugins/src/translate';
import { A2chPlugin } from 'plugins/src/2ch';
import { CatPlugin } from 'plugins/src/cat';
import { CoinPlugin } from 'plugins/src/coin';
import { DanbooruPlugin } from 'plugins/src/danbooru';

export const pluginBindings = [
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin),
  provide(IqTestPlugin),
  provide(BashimPlugin),
  provide(TranslatePlugin),
  // provide(ImagesPlugin),
  provide(A2chPlugin),
  provide(CatPlugin),
  provide(CoinPlugin),
  provide(DanbooruPlugin),
];
