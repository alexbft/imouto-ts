import { BotPlugin } from "core/bot_api/bot_plugin";
import { Input } from "core/bot_api/input";
import { TextMatch } from "core/bot_api/text_match";
import { OpenAiKey } from 'core/config/keys';
import { Inject, Injectable } from "core/di/injector";
import { logger } from 'core/logging/logger';
import { TgApi } from "core/tg/tg_api";
import { Message } from 'core/tg/tg_types';
import { Configuration, OpenAIApi } from 'openai';
import { CreateCompletionRequest } from 'openai/dist/api';

@Injectable
export class ChatPlugin implements BotPlugin {
  readonly name = 'Chat';
  private openAiApi!: OpenAIApi;

  constructor(
    private readonly input: Input,
    private readonly api: TgApi,
    @Inject(OpenAiKey) private openAiKey: string) { }

  init(): void {
    const openAiConfig = new Configuration({
      apiKey: this.openAiKey,
    });
    this.openAiApi = new OpenAIApi(openAiConfig);

    this.input.onText(/^!!([^]+)/, this.handle, this.onError);
  }

  private handle = async ({ message, match }: TextMatch): Promise<void> => {
    const userPrompt = match[1].trim();
    const request: CreateCompletionRequest = {
      model: 'text-davinci-003',
      prompt: `Answer as a friendly mascot little sister character. ${userPrompt}`,
      user: `${message.from!.id}`,
      max_tokens: 256,
    };
    logger.debug(`OpenAI request: ${JSON.stringify(request)}`);
    const response = await this.openAiApi.createCompletion(request);
    if (response.status !== 200) {
      await this.api.reply(message, `Ошибка ${response.status}`);
      return;
    }
    const responseText = response.data.choices[0].text ?? '[empty]';
    await this.api.reply(message, responseText.trim());
  }

  private onError = (message: Message) => this.api.reply(message, 'Ошибка');
}
