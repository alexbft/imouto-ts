import { provide } from 'core/di/provider';

import { BashimPlugin } from 'plugins/src/bashim';
import { HelloPlugin } from 'plugins/src/hello';
import { HelpPlugin } from 'plugins/src/help';
import { IdPlugin } from 'plugins/src/id';
import { IqTestPlugin } from 'plugins/src/iq_test';
// import { TranslatePlugin } from 'plugins/src/translate';
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
import { IntroPlugin } from 'plugins/src/intro';
import { XkcdPlugin } from 'plugins/src/xkcd';
import { YouTubePlugin } from 'plugins/src/youtube';
import { MessageCachePlugin } from 'plugins/src/message_cache/message_cache_plugin';
import { QuotePlugin } from 'plugins/src/quotes/quote_plugin';
import { MessageCache } from 'plugins/src/message_cache/message_cache';
import { AlarmClockPlugin } from 'plugins/src/alarm_clock';
import { CalcPlugin } from 'plugins/src/calc';
import { MathPlugin } from 'plugins/src/math';
import { KekPlugin } from './src/kek';

const helperBindings = [
  provide(MessageCache),
];

export const pluginBindings = [
  provide(A2chPlugin),
  provide(AlarmClockPlugin),
  provide(BashimPlugin),
  provide(CalcPlugin),
  provide(CatPlugin),
  provide(CoinPlugin),
  provide(DanbooruPlugin),
  provide(DogifyPlugin),
  provide(EchoPlugin),
  provide(GooglePlugin),
  provide(HelloPlugin),
  provide(HelpPlugin),
  provide(IdPlugin),
  provide(IntroPlugin),
  provide(IqTestPlugin),
  provide(KekPlugin),
  provide(MathPlugin),
  provide(MessageCachePlugin),
  provide(MoneyPlugin),
  provide(NyashPlugin),
  provide(QrPlugin),
  provide(QuotePlugin),
  provide(RollPlugin),
  provide(SilencePlugin),
  // provide(TranslatePlugin), // turned off by default
  provide(UserCachePlugin),
  provide(WeatherPlugin),
  provide(WhoPlugin),
  provide(XkcdPlugin),
  provide(YouTubePlugin),
];

export const allBindings = [
  ...helperBindings,
  ...pluginBindings
];
