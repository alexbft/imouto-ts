import { Message } from "node-telegram-bot-api";

export class TextMatch {
  constructor(public message: Message, public match: RegExpExecArray) {}
}
