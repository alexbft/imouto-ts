import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { Message } from "node-telegram-bot-api";
import { Injectable } from "core/di/injector";
import { TgApi } from "core/tg/tg_api";
import { Web } from "core/util/web";
import { fixMultiline } from "core/util/misc";

@Injectable
export class CoinPlugin implements BotPlugin {
  readonly name = 'Coin';

  constructor(private input: Input, private api: TgApi, private web: Web) {}

  init(): void {
    this.input.onText(/^!\s?(coin|койн|коин|к|c)\s*$/,
        (match) => new CoinQuery(this.api, this.web).handleOverall(match),
        this.onError);
    this.input.onText(/^!\s?(coin|койн|коин|к|c)\s+([\d\.]+)?\s*([A-Za-z]+)\s*([A-Za-z]+)?/,
        (match) => new CoinQuery(this.api, this.web).handleSpecific(match),
        this.onError);
  }

  onError = (msg: Message) => this.api.reply(msg, 'Just HODL man');
}

class CoinQuery {
  private data: any[] = [];

  constructor(private api: TgApi, private web: Web) {}

  private async search(): Promise<void> {
    this.data = await this.web.getJson('https://api.coinmarketcap.com/v1/ticker/');
  }

  private getData(code?: string): any {
    if (code == null) {
      return null;
    }
    return this.data.find(entry => entry.symbol === code);
  }

  private toFixed(n: number, digits: number): string {
    const f = -Math.floor(Math.log10(n)) + (digits - 1);
    const fix = f < digits ? digits : f;
    return `*${n.toFixed(fix)}*`;
  }

  private calc(from: any, to: any, amount: number = 1): string {
    const f = Number(from.price_btc);
    const t = Number(to.price_btc);
    const n = t / f * amount;
    return this.toFixed(n, 2);
  }

  private calcUsd(from: any, amount: number = 1): string {
    const n = Number(from.price_usd) * amount;
    return this.toFixed(n, 2);
  }

  private calcBtc(from: any, amount: number = 1): string {
    const n = Number(from.price_btc) * amount;
    return this.toFixed(n, 4);
  }

  private calcUsdCode(from: string): string {
    return this.calcUsd(this.getData(from));
  }

  private calcBtcCode(from: string): string {
    return this.calcBtc(this.getData(from));
  }

  async handleOverall({message}: TextMatch): Promise<void> {
    await this.search();
    const txt = fixMultiline(
        `1 Bitcoin = ${this.calcUsdCode('BTC')}\$
        1 Bitcoin Cash = ${this.calcUsdCode('BCH')}\$
        1 Ethereum = ${this.calcUsdCode('ETH')}\$
        1 Litecoin = ${this.calcBtcCode('LTC')} BTC
        1 Dash = ${this.calcBtcCode('DASH')} BTC
        1 Ripple = ${this.calcBtcCode('XRP')} BTC`);
    await this.api.respondWithText(message, txt, {parse_mode: 'Markdown'});
  }

  async handleSpecific({message, match}: TextMatch): Promise<void> {
    await this.search();
    const amount = match[2] != null ? Number(match[2]) : 1;
    const reqFrom = match[3].toUpperCase();
    const reqTo = match[4] != null ? match[4].toUpperCase() : undefined;

    if (amount > 0 && amount <= 1000000000) {
      const from = this.getData(reqFrom);
      const to = this.getData(reqTo);
      if (from != null) {
        let txt: string;
        if (to != null) {
          txt = fixMultiline(
              `${amount} ${from.name} = ${this.calc(to, from, amount)} ${to.name}
              1h: *${from.percent_change_1h}* 24h: *${from.percent_change_24h}* 7d: *${from.percent_change_7d}*`);
        } else {
          txt = fixMultiline(
              `${amount} ${from.name} = ${this.calcUsd(from, amount)}\$
              1h: *${from.percent_change_1h}* 24h: *${from.percent_change_24h}* 7d: *${from.percent_change_7d}*`);
        }
        await this.api.respondWithText(message, txt, {parse_mode: 'Markdown'});
      } else {
        await this.api.reply(message, 'Не знаю такой монеты!');
      }
    } else {
      await this.api.reply(message, 'Не могу посчитать!');
    }
  }
}
