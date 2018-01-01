import { provide } from 'core/di/provider';
import { Environment } from 'core/environment/environment';
import { ImoutoServer } from 'core/server/imouto_server';
import { Web } from 'core/util/web';
import { TgApi } from 'core/tg/tg_api';
import { TgClient } from 'core/tg/tg_client';
import { BotApi } from 'core/bot_api/bot_api';
import { ConfigLoader } from 'core/config/config_loader';

export const bindings = [
  provide(ConfigLoader),
  provide(Environment),
  provide(ImoutoServer),
  provide(Web),
  provide(TgApi),
  provide(TgClient),
  provide(BotApi),
];
