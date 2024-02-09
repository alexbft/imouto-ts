import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { CmcKey } from 'core/config/keys';
import { Inject, Injectable } from "core/di/injector";
import { logger } from 'core/logging/logger';
import { TgApi } from "core/tg/tg_api";
import { fixMultiline } from "core/util/misc";
import { requestOptionsFromUrl, toUrl, Web } from "core/util/web";
import { Message } from "node-telegram-bot-api";

@Injectable
export class CoinPlugin implements BotPlugin {
  readonly name = 'Coin';

  constructor(
    private input: Input,
    private api: TgApi,
    private web: Web,
    @Inject(CmcKey) private cmcKey: string) { }

  init(): void {
    this.input.onText(/^!\s?(coin|койн|коин|к|c)\s*$/,
      (match) => new CoinQuery(this.api, this.web, this.cmcKey).handleOverall(match),
      this.onError);
    this.input.onText(/^!\s?(coin|койн|коин|к|c)\s+([\d\.]+)?\s*([A-Za-z]+)(?:\s+([A-Za-z]+))?/,
      (match) => new CoinQuery(this.api, this.web, this.cmcKey).handleSpecific(match),
      this.onError);
  }

  onError = (msg: Message) => this.api.reply(msg, 'Just HODL man');
}

const defaultSymbols = ['BTC', 'ETH', 'NEAR', 'SOL', 'LINK', 'XMR', 'MINA'];

class CoinQuery {
  private data: CmcQuotesResponse | null = null;

  constructor(private api: TgApi, private web: Web, private cmcKey: string) { }

  private async search(symbols?: string[], convertTo?: string): Promise<void> {
    if (symbols == null) {
      symbols = defaultSymbols;
    }
    if (convertTo == null) {
      convertTo = 'USD';
    }
    const options = requestOptionsFromUrl(toUrl('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      symbol: symbols.join(','),
      convert: convertTo,
      // skip_invalid: true,
    }));
    options.headers = {
      'X-CMC_PRO_API_KEY': this.cmcKey,
    };
    const response = await this.web.sendRequest(this.web.request(options));
    this.data = await this.web.readResponseJson(response, { checkStatusCode: false });
    if (response.statusCode !== 200) {
      logger.warn('Invalid CMC response:', this.data);
    } else {
      logger.debug('CMC response:', this.data);
    }
  }

  private getData(code: string): CmcCurrencyData | undefined {
    if (this.data!.data != null) {
      return this.data!.data[code];
    } else {
      return undefined;
    }
  }

  private toFixed(n: number, digits: number): string {
    const f = -Math.floor(Math.log10(n)) + (digits - 1);
    const fix = f < digits ? digits : f;
    return `*${n.toFixed(fix)}*`;
  }

  private calcUsd(from: CmcQuote, amount: number = 1): string {
    const n = from.price * amount;
    if (n >= 10) {
      return this.toFixed(n, 2);
    } else {
      return this.toFixed(n, 4);
    }
  }

  private calcRaw(from: CmcQuote, amount: number = 1): string {
    const n = from.price * amount;
    return this.toFixed(n, 4);
  }

  private calcUsdCode(from: string): string {
    return this.calcUsd(this.getData(from)!.quote['USD']);
  }

  // private calcBtc(from: CmcQuote, amount: number = 1): string {
  //   return this.calc(from, this.getData('BTC')!.quote['USD'], amount);
  // }

  // private calcBtcCode(from: string): string {
  //   return this.calcBtc(this.getData(from)!.quote['USD']);
  // }

  // private calc(from: CmcQuote, to: CmcQuote, amount: number = 1): string {
  //   const f = from.price;
  //   const t = to.price;
  //   const n = f / t * amount;
  //   return this.toFixed(n, 4);
  // }

  private showDelta(coin: string): string {
    const data = this.getData(coin);
    const deltaH: number = data!.quote['USD'].percent_change_1h;
    const deltaD: number = data!.quote['USD'].percent_change_24h;
    const deltaW: number = data!.quote['USD'].percent_change_7d;
    let period = 'за час';
    let delta = deltaH;
    if (Math.abs(delta * 2) < Math.abs(deltaD)) {
      period = 'за день';
      delta = deltaD;
    }
    if (Math.abs(delta * 2) < Math.abs(deltaW)) {
      period = 'за неделю';
      delta = deltaW;
    }
    const bold = Math.abs(delta) >= 5 ? '*' : '';
    const plus = delta > 0 ? '+' : '';
    return `${bold}(${plus}${delta.toFixed(2)}% ${period})${bold}`;
  }

  async handleOverall({ message }: TextMatch): Promise<void> {
    await this.search();
    const txt = defaultSymbols.map(c => {
      const data = this.getData(c);
      return `1 ${data?.name} = ${this.calcUsdCode(c)}\$ ${this.showDelta(c)}`;
    }).join('\n');
    await this.api.respondWithText(message, txt, { parse_mode: 'Markdown' });
  }

  async handleSpecific({ message, match }: TextMatch): Promise<void> {
    const amount = match[2] != null ? Number(match[2]) : 1;
    const reqFrom = match[3].toUpperCase();
    const reqTo = match[4] != null ? match[4].toUpperCase() : undefined;
    await this.search([reqFrom], reqTo);

    if (amount > 0 && amount <= 1000000000) {
      const from = this.getData(reqFrom);
      if (from != null) {
        let quote = reqTo == null ? from.quote['USD'] : from.quote[reqTo];
        let result = reqTo == null || reqTo == 'USD' ? this.calcUsd(quote, amount) + '$' : this.calcRaw(quote, amount) + ` ${reqTo}`;
        let txt: string;
        txt = fixMultiline(
          `${amount} ${from.name} = ${result}
           1h: *${quote.percent_change_1h}* 24h: *${quote.percent_change_24h}* 7d: *${quote.percent_change_7d}*`);
        await this.api.respondWithText(message, txt, { parse_mode: 'Markdown' });
      } else {
        await this.api.reply(message, 'Не знаю такой монеты!');
      }
    } else {
      await this.api.reply(message, 'Не могу посчитать!');
    }
  }
}

interface CmcStatus {
  timestamp: string;
  error_code: number;
  error_message: string;
  elapsed: number;
  credit_count: number;
}

interface CmcQuote {
  price: number;
  market_cap: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  last_updated: string;
}

interface CmcCurrencyData {
  id: number;
  name: string;
  symbol: string;
  slug: string;
  last_updated: string;
  quote: {
    [key: string]: CmcQuote;
  };
}

interface CmcQuotesResponse {
  data?: {
    [key: string]: CmcCurrencyData;
  };
  status: CmcStatus;
}
