import { provide } from 'core/di/provider';
import { Environment } from 'core/environment/environment';
import { ImoutoServer } from 'core/server/imouto_server';
import { Web } from 'core/util/web';
import { TgApi } from 'core/tg/tg_api';
import { TgClient } from 'core/tg/tg_client';
import { BotApi } from 'core/bot_api/bot_api';
import * as config from 'core/config/module';

const bindings = [
  provide(Environment),
  provide(ImoutoServer),
  provide(Web),
  provide(TgApi),
  provide(TgClient),
  provide(BotApi),
];

export const mainBindings = bindings.concat(
  config.bindings);
