import { Input } from 'core/bot_api/input';
import { TgApi } from 'core/tg/tg_api';
import { Plugin } from 'core/bot_api/plugin';
import { Inject } from 'core/di/injector';
import { Message } from 'node-telegram-bot-api';

const helptext = `Команды, которые я понимаю:
!скажи <текст>
!переведи [<язык источника>] [<язык перевода>] <текст> - перевод текста
!цитата(!ц,!q) [<номер>|<автор>|<текст>] - поиск цитат в цитатнике
!цц(!qq) - цитата с положительным рейтингом
!roll [число|диапазон|dice] - случайный бросок кубиков
!печет(...) - выразить свое негодование
!статус - посмотреть или изменить статус
!пик(!покажи,!img) <картинка> - поиск картинок
!найди(!g) <текст> - поиск в Google
!видео(!yt) <текст> - поиск видео на YouTube
!аниме <название> - поиск аниме
!манга <название> - поиск манги
!вн(!vn) [<название>] - поиск визуальных новелл
!курс - курс валют
!погода(!weather) <город> - погода на данный момент. Или просто отправьте локацию.
!xkcd [en] [<номер>] - комиксы XKCD
!няш(!мяш) - случайный пост или картинка с nya.sh
!баш - случайная цитата с bash.im
!няша [<теги>] - случайная картинка с danbooru
!команды(!help) - список команд`

@Inject
export class HelpPlugin implements Plugin {
  readonly name = 'Help'

  constructor(private api: TgApi) {}

  init(input: Input) {
    input.onText(/^[!\/](help|помощь|команды|хэлп|хелп)\b/, this.onMessage)
  }

  onMessage = (msg: Message) => {
    this.api.reply(msg, helptext)
  }
}

