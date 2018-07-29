import { BotApi } from 'core/bot_api/bot_api';
import { ConfigLoader } from 'core/config/config_loader';
import { provide } from 'core/di/provider';
import { Environment } from 'core/environment/environment';
import { ImoutoServer } from 'core/server/imouto_server';
import { TgApi } from 'core/tg/tg_api';
import { TgClient } from 'core/tg/tg_client';
import { Web } from 'core/util/web';
import { Scheduler } from 'core/util/scheduler';
import { UserService } from 'core/tg/user_service';
import { FilterFactory } from 'core/filter/filter_factory';
import { DatabaseFactory } from 'core/db/database_factory';

export const bindings = [
  provide(ConfigLoader),
  provide(Environment),
  provide(ImoutoServer),
  provide(Web),
  provide(TgApi),
  provide(TgClient),
  provide(BotApi),
  provide(Scheduler),
  provide(UserService),
  provide(FilterFactory),
  provide(DatabaseFactory, { useValue: new DatabaseFactory(':memory:') }),
];
