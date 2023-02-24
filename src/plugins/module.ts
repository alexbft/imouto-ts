import { provide } from 'core/di/provider';

import { BashimPlugin } from 'plugins/src/bashim';
import { HelloPlugin } from 'plugins/src/hello';
import { HelpPlugin } from 'plugins/src/help';
import { IdPlugin } from 'plugins/src/id';
import { IqTestPlugin } from 'plugins/src/iq_test';
// import { TranslatePlugin } from 'plugins/src/translate';
import { A2chPlugin } from 'plugins/src/2ch';
import { AlarmClockPlugin } from 'plugins/src/alarm_clock';
import { CalcPlugin } from 'plugins/src/calc';
import { CatPlugin } from 'plugins/src/cat';
import { ChatPlugin } from 'plugins/src/chat';
import { CoinPlugin } from 'plugins/src/coin';
import { DanbooruPlugin } from 'plugins/src/danbooru';
import { DogifyPlugin } from 'plugins/src/dogify';
import { EchoPlugin } from 'plugins/src/echo';
import { GooglePlugin } from 'plugins/src/google';
import { IntroPlugin } from 'plugins/src/intro';
import { MathPlugin } from 'plugins/src/math';
import { MessageCache } from 'plugins/src/message_cache/message_cache';
import { MessageCachePlugin } from 'plugins/src/message_cache/message_cache_plugin';
import { MoneyPlugin } from 'plugins/src/money';
import { NyashPlugin } from 'plugins/src/nyash';
import { QrPlugin } from 'plugins/src/qr';
import { QuotePlugin } from 'plugins/src/quotes/quote_plugin';
import { RollPlugin } from 'plugins/src/roll';
import { SilencePlugin } from 'plugins/src/silence';
import { WeatherPlugin } from 'plugins/src/weather';
import { WhoPlugin } from 'plugins/src/who';
import { XkcdPlugin } from 'plugins/src/xkcd';
import { YouTubePlugin } from 'plugins/src/youtube';

const helperBindings = [
  provide(MessageCache),
];

export const pluginBindings = [
  provide(A2chPlugin),
  provide(AlarmClockPlugin),
  provide(BashimPlugin),
  provide(CalcPlugin),
  provide(CatPlugin),
  provide(ChatPlugin),
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
  // provide(KekPlugin),
  provide(MathPlugin),
  provide(MessageCachePlugin),
  provide(MoneyPlugin),
  provide(NyashPlugin),
  provide(QrPlugin),
  provide(QuotePlugin),
  provide(RollPlugin),
  provide(SilencePlugin),
  // provide(TranslatePlugin), // turned off by default
  // provide(UserCachePlugin), // crap
  provide(WeatherPlugin),
  provide(WhoPlugin),
  provide(XkcdPlugin),
  provide(YouTubePlugin),
];

export const allBindings = [
  ...helperBindings,
  ...pluginBindings
];
