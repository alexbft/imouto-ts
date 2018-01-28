import { BotApi } from 'core/bot_api/bot_api';
import { ConfigLoader } from 'core/config/config_loader';
import * as config from 'core/config/module';
import { provide } from 'core/di/provider';
import { Environment } from 'core/environment/environment';
import { ImoutoServer } from 'core/server/imouto_server';
import { TgApi } from 'core/tg/tg_api';
import { TgClient } from 'core/tg/tg_client';
import { Web } from 'core/util/web';

export const bindings = [
  provide(ConfigLoader),
  provide(Environment),
  provide(ImoutoServer),
  provide(Web),
  provide(TgApi),
  provide(TgClient),
  provide(BotApi),
];
