import { provide } from 'core/di/provider';

import { BashimPlugin } from 'plugins/src/bashim';
import { HelloPlugin } from 'plugins/src/hello';
import { HelpPlugin } from 'plugins/src/help';
import { IdPlugin } from 'plugins/src/id';
import { IqTestPlugin } from 'plugins/src/iq_test';
import { TranslatePlugin } from 'plugins/src/translate';
import { A2chPlugin } from 'plugins/src/2ch';
import { CatPlugin } from 'plugins/src/cat';
import { CoinPlugin } from 'plugins/src/coin';
import { DanbooruPlugin } from 'plugins/src/danbooru';
import { DogifyPlugin } from 'plugins/src/dogify';
import { EchoPlugin } from 'plugins/src/echo';
import { GooglePlugin } from 'plugins/src/google';
import { MoneyPlugin } from 'plugins/src/money';

export const pluginBindings = [
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin),
  provide(IqTestPlugin),
  provide(BashimPlugin),
  provide(TranslatePlugin),
  provide(A2chPlugin),
  provide(CatPlugin),
  provide(CoinPlugin),
  provide(DanbooruPlugin),
  provide(DogifyPlugin),
  provide(EchoPlugin),
  provide(GooglePlugin),
  provide(MoneyPlugin),
];
