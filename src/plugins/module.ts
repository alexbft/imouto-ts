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
import { NyashPlugin } from 'plugins/src/nyash';
import { QrPlugin } from 'plugins/src/qr';
import { RollPlugin } from 'plugins/src/roll';
import { SilencePlugin } from 'plugins/src/silence';
import { UserCachePlugin } from 'plugins/src/user_cache';
import { WhoPlugin } from 'plugins/src/who';
import { WeatherPlugin } from 'plugins/src/weather';

export const pluginBindings = [
  provide(A2chPlugin),
  provide(BashimPlugin),
  provide(CatPlugin),
  provide(CoinPlugin),
  provide(DanbooruPlugin),
  provide(DogifyPlugin),
  provide(EchoPlugin),
  provide(GooglePlugin),
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin),
  provide(IqTestPlugin),
  provide(MoneyPlugin),
  provide(NyashPlugin),
  provide(QrPlugin),
  provide(RollPlugin),
  provide(SilencePlugin),
  provide(TranslatePlugin),
  provide(UserCachePlugin),
  provide(WeatherPlugin),
  provide(WhoPlugin),
];
