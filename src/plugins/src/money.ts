import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TgApi } from "core/tg/tg_api";
import { Web } from "core/util/web";
import { TextMatch } from "core/bot_api/text_match";
import { duration, Moment } from "moment";
import * as moment from "moment";
import { logger } from "core/logging/logger";
import { Props, fixMultiline, formatDate, PropsOf } from "core/util/misc";
import { Inject, Injectable } from "core/di/injector";
import { ExchangeKey } from "core/config/keys";
import { Message } from "node-telegram-bot-api";

const maxCacheTime = duration(15, 'minutes');

@Injectable
export class MoneyPlugin implements BotPlugin {
  readonly name = 'Money';

  private lastCacheTime?: Moment;
  private lastCachedData?: Props;

  constructor(
      private readonly input: Input,
      private readonly api: TgApi,
      private readonly web: Web,
      @Inject(ExchangeKey) private readonly exchangeKey: string) {}

  init(): void {
    this.input.onText(/^!\s?(курс|деньги|money|cs)\s*$/, (match) => this.handle(match, false), this.onError);
    this.input.onText(/^!\s?(курс|деньги|money|cs)\s+([\d\.]+)?\s*([A-Za-z]+)(?:\s+([A-Za-z]+))?/, (match) => this.handle(match, true), this.onError);
  }

  private async handle({message, match}: TextMatch, isSpecific: boolean): Promise<any> {
    let data: Props;

    function calc(from: string, to: string, amount: number = 1): string {
      const f = data.rates[from];
      const t = data.rates[to];
      const n = (t / f * amount);
      const fx = -Math.floor(Math.log10(n)) + 1
      const fix = fx < 2 ? 2 : fx;
      return '*' + n.toFixed(fix) + '*';
    }

    data = await this.getData({cache: isSpecific});
    if (isSpecific) {
      const amount = match[2] != null ? Number(match[2]) : 1;
      const reqFrom = match[3].toUpperCase();
      const reqTo = match[4] != null ? match[4].toUpperCase() : 'RUB';
      if (!(amount > 0 && amount < 1000000000)) {
        return this.api.reply(message, 'Не могу посчитать!');
      }
      if (!(reqFrom in data.rates) || !(reqTo in data.rates)) {
        return this.api.reply(message, 'Не знаю такой валюты!');
      }
      const aliases: PropsOf<string> = {
        'RUB': 'деревяшек',
        'BYR': 'перков',
        'BYN': 'новоперков',
        'USD': '$',
      };
      const reqToS: string = aliases[reqTo] || reqTo;
      const txt = `${amount} ${reqFrom} = ${calc(reqFrom, reqTo, amount)} ${reqToS}`;
      await this.api.respondWithText(message, txt, { parse_mode: 'Markdown' });
    } else {
      const date = new Date(data.timestamp * 1000);
      const txt = fixMultiline(`
        Курс на *${formatDate(date)}*

        1 $ = ${calc('USD', 'RUB')} деревяшек
        1 € = ${calc('EUR', 'RUB')} деревяшек
        1 Swiss franc = ${calc('CHF', 'RUB')} деревяшек
        ${calc('USD', 'JPY')} ¥ = 1\$
        1 Bitcoin = ${calc('BTC', 'ETH')} ETH = ${calc('BTC', 'USD')}\$
        ${calc('USD', 'UAH')} гривен = 1\$
        1 бульба = ${calc('BYN', 'USD')}\$ = ${calc('BYN', 'RUB')} деревяшек
      `);
      await this.api.respondWithText(message, txt, { parse_mode: 'Markdown' });
    }
  }

  private async getData(options: {cache: boolean}): Promise<Props> {
    if (options.cache) {
      if (this.lastCacheTime != null && this.lastCacheTime.add(maxCacheTime).isAfter()) {
        logger.debug('Retrieving from cache.');
        return this.lastCachedData!;
      }
    }
    this.lastCachedData = await this.web.getJson('https://openexchangerates.org/api/latest.json', {
      app_id: this.exchangeKey,
      show_alternative: 1,
    });
    this.lastCacheTime = moment();
    return this.lastCachedData!;
  }

  private onError = (message: Message) => this.api.reply(message, 'Денег нет');
}
