import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Input, CallbackHandler } from 'core/bot_api/input';
import { TextMatch } from 'core/bot_api/text_match';
import { TgApi } from 'core/tg/tg_api';
import { Message, InlineKeyboardMarkup } from 'node-telegram-bot-api';
import { Web } from 'core/util/web';
import { Inject } from 'core/di/injector';
import { GoogleKey, OpenWeatherMapKey } from 'core/config/keys';
import { logger } from 'core/logging/logger';
import * as moment from 'moment';
import { fixMultiline, capitalize } from 'core/util/misc';
import { SubscriptionManager } from 'core/util/subscription_manager';

interface GeoCodeData {
  address: string;
  location: {
    lat: number;
    lng: number;
  }
}

interface Weather {
  id: number;
  main: string;
  description: string;
  icon: string;
}

interface WeatherData {
  cityId: number;
  name: string;
  countryCode: string;
  weather: Weather;
  temperature: number;
  humidity: number;
  pressure: number;
  clouds: number;
  wind: {
    speed: number;
    deg: number;
  },
  date: number;
}

interface ForecastItem {
  date: moment.Moment;
  temperature: number;
  weather: Weather;
}

interface ForecastData {
  cityId: number;
  name: string;
  countryCode: string;
  list: ForecastItem[];
}

interface ForecastBlock {
  items: ForecastItem[];
  avgTemperature: number;
  icons: string[];
  description: string;
}

interface ForecastRow {
  date: moment.Moment;
  morning?: ForecastBlock;
  afternoon?: ForecastBlock;
  evening?: ForecastBlock;
}

function getIcon(type: string): string {
  switch (type) {
    case "01d": return "☀️";
    case "01n": return "☀";
    case "02d": return "🌤";
    case "02n": return "🌤";
    case "03d": return "☁️";
    case "03n": return "☁️";
    case "04d": return "☁️";
    case "04n": return "☁️";
    case "09d": return "🌧";
    case "09n": return "🌧";
    case "10d": return "🌦";
    case "10n": return "🌦";
    case "11d": return "🌩";
    case "11n": return "🌩";
    case "13d": return "🌨";
    case "13n": return "🌨";
    case "50d": return "🌫";
    case "50n": return "🌫";
    default: return '';
  }
}

function rotation(deg: number): string {
  const normalized = (deg + 180) % 360;
  const sectionFrac = normalized * 8 / 360 - 0.5;
  let section: number;
  if (sectionFrac < 0) {
    section = 0;
  } else {
    section = Math.floor(sectionFrac);
  }
  return ['с юга', 'c юго-запада', 'с запада', 'с северо-запада', 'с севера', 'с северо-востока', 'с востока', 'с юго-востока'][section];
}

const forecastMarkup: InlineKeyboardMarkup = {
  inline_keyboard: [[{
    text: 'Прогноз на 5 дней',
    callback_data: 'f',
  }]]
};

const nowMarkup: InlineKeyboardMarkup = {
  inline_keyboard: [[{
    text: 'Погода в настоящее время',
    callback_data: 'n',
  }]]
}

export class WeatherPlugin implements BotPlugin {
  readonly name = 'Weather';

  private readonly subscriptionManager = new SubscriptionManager();

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    private readonly web: Web,
    @Inject(GoogleKey) private readonly googleKey: string,
    @Inject(OpenWeatherMapKey) private readonly openWeatherMapKey: string,
  ) { }

  init(): void {
    this.input.onText(/^!\s?(погода|weather)\s+(.+)$/, this.handle, this.onError);
  }

  dispose(): void {
    this.subscriptionManager.dispose();
  }

  private handle = async ({ message, match }: TextMatch): Promise<any> => {
    const address = match[2];
    const geoCodeData = await this.geoCode(address);
    if (geoCodeData == null) {
      return this.api.reply(message, 'Адрес не найден.');
    }
    const weatherData = await this.getWeather(geoCodeData.location);
    if (weatherData == null) {
      return this.api.reply(message, 'Ошибка при получении погодных данных.')
    }
    const msg = await this.api.respondWithText(message, this.formatResult(geoCodeData, weatherData), {
      parse_mode: 'Markdown',
      reply_markup: forecastMarkup
    });
    this.subscriptionManager.add(this.input.onCallback(msg, this.makeHandler(msg, geoCodeData, weatherData)));
  }

  private makeHandler(message: Message, geo: GeoCodeData, weather: WeatherData): CallbackHandler {
    let haveForecast: boolean = false;
    let forecast: ForecastData | null = null;
    return async (cb) => {
      switch (cb.data) {
        case 'n':
          await this.api.editMessageText({
            parse_mode: 'Markdown',
            message_id: message.message_id,
            chat_id: message.chat.id,
            text: this.formatResult(geo, weather),
            reply_markup: forecastMarkup
          });
          await this.api.answerCallback(cb.id, '');
          break;
        case 'f':
          if (!haveForecast) {
            haveForecast = true;
            forecast = await this.getForecast(weather.cityId);
          }
          if (forecast == null) {
            await this.api.answerCallback(cb.id, 'Прогноз погоды недоступен.');
          } else {
            await this.api.editMessageText({
              parse_mode: 'Markdown',
              message_id: message.message_id,
              chat_id: message.chat.id,
              text: this.formatForecast(geo, forecast),
              reply_markup: nowMarkup
            });
            await this.api.answerCallback(cb.id, '');
          }
          break;
        default:
          throw new Error(`Unhandled callback: ${cb.data}`);
      }
    }
  }

  private onError = (message: Message) => this.api.reply(message, 'Кажется, дождь начинается...');

  private async geoCode(address: string): Promise<GeoCodeData | null> {
    const data = await this.web.getJson('https://maps.googleapis.com/maps/api/geocode/json', {
      address,
      language: 'ru',
      key: this.googleKey
    });
    if (data.status !== 'OK') {
      logger.warn('Error from GeoCode API', data);
      return null;
    }
    if (data.results == null || data.results.length < 1) {
      return null;
    }
    const result = data.results[0];
    return {
      address: result.formatted_address,
      location: result.geometry.location
    };
  }

  private async getWeather({ lat, lng }: { lat: number, lng: number }): Promise<WeatherData | null> {
    const data = await this.web.getJson('http://api.openweathermap.org/data/2.5/weather', {
      lat: lat,
      lon: lng,
      lang: 'ru',
      units: 'metric',
      appid: this.openWeatherMapKey
    });
    if (data.cod !== 200) {
      logger.warn('Error from OpenWeatherMap', data);
      return null;
    }
    return {
      cityId: data.id,
      name: data.name,
      countryCode: data.sys.country,
      weather: data.weather[0],
      temperature: data.main.temp,
      humidity: data.main.humidity,
      pressure: data.main.grnd_level || data.main.pressure,
      clouds: data.clouds.all,
      wind: data.wind,
      date: data.dt,
    };
  }

  private async getForecast(cityId: number): Promise<ForecastData | null> {
    const data = await this.web.getJson('http://api.openweathermap.org/data/2.5/forecast', {
      id: cityId,
      lang: 'ru',
      units: 'metric',
      appid: this.openWeatherMapKey
    });
    if (String(data.cod) !== '200') {
      logger.warn('Error from OpenWeatherMap', data);
      return null;
    }
    return {
      cityId: data.city.id,
      name: data.city.name,
      countryCode: data.country,
      list: (data.list as any[]).map(item => ({
        date: moment.unix(item.dt),
        temperature: item.main.temp,
        weather: item.weather[0],
      }))
    };
  }

  private formatResult(geo: GeoCodeData, weather: WeatherData): string {
    const time = moment.unix(weather.date).from(moment());
    const icon = getIcon(weather.weather.icon);
    const temp = weather.temperature > 0 ? `+${weather.temperature.toFixed()}` : `${weather.temperature.toFixed()}`
    return fixMultiline(`
      Погода в настоящее время (данные получены ${time})
      *${geo.address}* (${weather.name})

      ${icon} *${capitalize(weather.weather.description)}*
      🌡 Температура: *${temp} °C*
      ☁️ Облачность: *${weather.clouds}%*
      💦 Влажность: *${weather.humidity}%*
      💨 Ветер: *${weather.wind.speed} км/ч ${rotation(weather.wind.deg)}*
      📊 Давление: *${(weather.pressure * 0.75006375541921).toFixed()} мм.рт.ст.*
    `);
  }

  private formatForecast(geo: GeoCodeData, forecast: ForecastData): string {
    const rows = this.groupItems(forecast.list);
    return fixMultiline(`
      Прогноз погоды
      *${geo.address}* (${forecast.name})

      ${rows.map(row => this.formatForecastRow(row)).join('\n\n')}
    `);
  }

  private groupItems(items: ForecastItem[]): ForecastRow[] {
    function getPeriod(item: ForecastItem): keyof ForecastRow {
      const hour = item.date.hour();
      if (hour < 11) {
        return 'morning';
      } else if (hour < 18) {
        return 'afternoon';
      } else {
        return 'evening';
      }
    }

    function add(row: ForecastRow, item: ForecastItem): void {
      const period = getPeriod(item);
      if (row[period] == null) {
        row[period] = createBlock(item);
      } else {
        addBlock(row[period] as ForecastBlock, item);
      }
    }

    function create(item: ForecastItem): ForecastRow {
      let row: ForecastRow = {
        date: item.date
      };
      add(row, item);
      return row;
    }

    function createBlock(item: ForecastItem): ForecastBlock {
      return {
        items: [item],
        avgTemperature: item.temperature,
        icons: [item.weather.icon],
        description: item.weather.description
      };
    }

    function addBlock(block: ForecastBlock, item: ForecastItem): void {
      block.items.push(item);
      block.avgTemperature = block.items.map(it => it.temperature).reduce((a, b) => a + b, 0) / block.items.length;
      block.icons.push(item.weather.icon);
      let description = findMostFrequent(block.items.map(it => it.weather.description));
      if (description == null) {
        description = findMostFrequent(block.items.map(it => it.weather.main));
        if (description === 'Clouds') {
          description = 'облачно';
        } else if (description === 'Rain') {
          description = 'дождь';
        } else if (description == null) {
          description = item.weather.description;
        }
      }
      block.description = description;
    }

    function findMostFrequent(a: string[]): string | null {
      const map = new Map<string, number>();
      for (const s of a) {
        if (map.has(s)) {
          map.set(s, map.get(s)! + 1);
        } else {
          map.set(s, 1);
        }
      }
      const pairs = Array.from(map.entries());
      pairs.sort(([_, a], [__, b]) => b - a);
      const [s, num] = pairs[0];
      return num > 1 ? s : null;
    }

    const dateMap = new Map<number, ForecastRow>();
    for (const item of items) {
      const doy = item.date.dayOfYear();
      if (dateMap.has(doy)) {
        add(dateMap.get(doy)!, item);
      } else {
        dateMap.set(doy, create(item));
      }
    }
    return Array.from(dateMap.values());
  }

  private formatForecastRow(row: ForecastRow): string {
    const blocks: string[] = [];
    if (row.morning != null) {
      blocks.push(`утром ${this.formatForecastBlock(row.morning)}`);
    }
    if (row.afternoon != null) {
      blocks.push(`днём ${this.formatForecastBlock(row.afternoon)}`);
    }
    if (row.evening != null) {
      blocks.push(`вечером ${this.formatForecastBlock(row.evening)}`);
    }
    const date = row.date.format('LL').split(' ').slice(0, 2).join(' ');
    return `*${date}*\n${blocks.join('\n')}`;
  }

  private formatForecastBlock(block: ForecastBlock): string {
    const temp = block.avgTemperature > 0 ? `+${block.avgTemperature.toFixed()}` : `${block.avgTemperature.toFixed()}`;
    const icons = block.icons.map(getIcon).join('');
    const desc = block.description;
    return `*${temp} °C* ${icons} ${desc}`;
  }
}
