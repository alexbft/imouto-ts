import { Input } from 'core/bot_api/input';
import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { TextMatch } from 'core/bot_api/text_match';
import { fixMultiline } from 'core/util/misc';

const helptext = fixMultiline(`
  Команды, которые я понимаю:

  *!скажи*(*!echo*) <текст>
  *!переведи*(*!tr*) \\[<язык источника>] \\[<язык перевода>] <текст> - перевод текста
  *!цитата*(*!ц*, *!q*) \\[<номер>|<автор>|<текст>|<тэг>|<с номера>+] - поиск цитат в цитатнике
  *!ролл*(*!roll*) \\[число|диапазон|dice] - случайный бросок кубиков
  *!пик*(*!покажи*, *!img*) <картинка> - поиск картинок
  *!ищи*(*!g*) <текст> - поиск в Google
  *!видео*(*!yt*) <текст> - поиск видео на YouTube
  *!курс*(*!cs*) - курс валют
  *!койн*(*!к*, *!c*) - курс криптовалют
  *!погода*(*!weather*) <город> - погода (и прогноз погоды)
  *!xkcd* \\[<номер>|<текст>] - комиксы XKCD
  *!няш*(*!мяш*) \\[<номер>]  - случайный пост или картинка с nya.sh
  *!баш* \\[<номер>] - случайная цитата с bash.im
  *!няша* \\[<теги>] - картинки с danbooru
  *!кто*(*!who*) \\[<имя>] - посмотреть статистику пользователя
  *!кот*(*!cat*) - картинки с котиками
  *!dogify* <text>... - wow, so doge
  *!qr* <text> - сделать QR-код из текста
  *!напомни*(*!alarm*) \\[<время, событие>] - поставить напоминание
  *!кальк*(*!calc*, *$*) - калькулятор
  *!команды*(*!help*) - список команд`);

@Injectable
export class HelpPlugin implements BotPlugin {
  readonly name = 'Help';

  constructor(private input: Input, private api: TgApi) { }

  init(): void {
    this.input.onText(/^[!\/]\s?(help|помощь|команды|хэлп|хелп|start)\b/, this.onMessage);
  }

  onMessage = async ({ message }: TextMatch) => {
    await this.api.reply(message, helptext, { parse_mode: 'Markdown' });
  }
}
