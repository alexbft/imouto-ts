import { Input } from 'core/bot_api/input';
import { Plugin } from 'core/bot_api/plugin';
import { GoogleCX, GoogleKey } from 'core/config/keys';
import { Inject, Injectable } from 'core/di/injector';
import { TgApi } from 'core/tg/tg_api';
import { Web } from 'core/util/web';
import { Message } from 'node-telegram-bot-api';

const firstKeyboard = [[{ text: 'Следующая', callback_data: 'next' }]];

const lastKeyboard = [[{ text: 'Предыдущая', callback_data: 'prev' }]];

const pageKeyboard = [
  [
    { text: 'Предыдущая', callback_data: 'prev' },
    { text: 'Следующая', callback_data: 'next' },
  ],
];

interface GooglePic {
  link: string;
}

interface Context {
  txt: string;
  pic: GooglePic;
  picSet: GooglePic[];
  index: number;
  keyboard: typeof firstKeyboard | typeof lastKeyboard | typeof pageKeyboard;
  msg: Message;
}

type GoogleSearchResult = GooglePic[];

@Injectable
export class ImagesPlugin implements Plugin {
  readonly name = 'Images';

  constructor(
    private web: Web,
    private api: TgApi,
    @Inject(GoogleKey) private googlekey: string,
    @Inject(GoogleCX) private googlecx: string,
  ) {}

  init(input: Input): void {
    input.onText(
      /!(покажи|пик|пек|img|pic|moar|моар|more|еще|ещё)(?: (.+))?/,
      this.onMessage,
    );
  }

  sendInline(msg: Message, pic, picSet, txt): void {
    const url = pic.link;
    const context: Context = {
      msg,
      txt,
      pic,
      picSet,
      index: picSet.indexOf(pic),
      keyboard: firstKeyboard,
    };
    this.api.sendMessage({
      chat_id: msg.chat.id,
      text: url,
      reply_markup: {
        inline_keyboard: context.keyboard,
      },
    });
  }

  updateInline({ msg, pic, keyboard }: Context): void {
    this.api.editMessageText(msg, pic.link, {
      reply_markup: {
        inline_keyboard: keyboard,
      },
    });
  }

  search(txt: string, offset?: number): Promise<GoogleSearchResult> {
    return this.rawSearch(txt, 8, offset);
  }

  async onCallback(context: Context, cb, msg: Message): Promise<void> {
    context.msg = msg;
    let { index, keyboard, pic, picSet, txt } = context;
    switch (cb.data) {
      case 'prev':
        if (index > 1) {
          index -= 1;
        } else {
          index = 0;
          keyboard = firstKeyboard;
        }
        pic = picSet[index];
        this.updateInline(context);
        // cb.answer('');
        break;

      case 'next':
        if (index + 1 < picSet.length) {
          index += 1;
          keyboard = pageKeyboard;
        } else {
          const results = await this.search(txt, picSet.length);
          index = picSet.length + 1;
          picSet = picSet.concat(results);
        }
        pic = picSet[index];
        this.updateInline(context);
        // cb.answer('');
        break;
    }
  }

  onMessage = async (msg: Message, match: RegExpExecArray): Promise<void> => {
    try {
      let txt = match[2];
      if (
        txt == null &&
        msg.reply_to_message &&
        msg.reply_to_message.text != null
      ) {
        txt = msg.reply_to_message.text;
      }
      if (txt == null) {
        return;
      }
      const results = await this.search(txt);
      console.log(results);
      if (results == null || results.length === 0) {
        this.api.sendMessage({
          chat_id: msg.chat.id,
          text: 'Ничего не найдено!',
        });
      } else {
        const result = results[0];
        this.sendInline(msg, result, results, txt);
      }
    } catch (e) {
      this.onError(msg);
    }
  }

  onError = ({ chat }: Message): void => {
    this.api.sendMessage({
      chat_id: chat.id,
      text: 'Поиск не удался...',
    });
  }

  private async rawSearch(
    txt: string,
    rsz = 1,
    offset = 1,
  ): Promise<GoogleSearchResult> {
    const res = await this.web.get(
      'https://www.googleapis.com/customsearch/v1',
      {
        qs: {
          key: this.googlekey,
          cx: this.googlecx,
          gl: 'ru',
          hl: 'ru',
          num: rsz,
          start: offset,
          safe: 'high',
          searchType: 'image',
          q: txt,
        },
      },
    );
    const json = await res.json();

    console.log(json);

    return json.items;
  }
}
