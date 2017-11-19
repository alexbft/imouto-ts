import { Plugin } from "core/bot_api/plugin";
import { Inject } from "core/di/injector";
import { Input } from "core/bot_api/input";
import { TgApi } from "core/tg/tg_api";
import { Message, User } from "node-telegram-bot-api";
import Xor4k from "vendor/xor4096";

const fullName = (user: User) =>
  user.last_name
    ? `${user.first_name} ${user.last_name}`
    : `${user.first_name}`;

const iq = (s: string) => {
  const xorgen = new Xor4k(s + "sas" + new Date().toDateString());
  const res = xorgen.double();
  if (res < 0.5) return 30 + Math.round(res * 100);
  else return 80 + Math.round(res * 100);
};

@Inject
export class IqTestPlugin implements Plugin {
  readonly name = "IQ Test";

  constructor(private api: TgApi) {}

  init(input: Input) {
    input.onText(/\/iq/, this.onMessage);
  }

  onMessage = (msg: Message) => {
    this.api.reply(msg, `Ваш IQ: ${iq(fullName(msg.from!))}`);
  };
}
