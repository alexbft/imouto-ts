import { BotPlugin } from 'core/bot_api/bot_plugin';
import { Injectable } from 'core/di/injector';
import { Input } from 'core/bot_api/input';
import { TextMatch } from 'core/bot_api/text_match';
import { duration } from 'moment';
import * as moment from 'moment';
import { FilterFactory } from 'core/filter/filter_factory';
import { Scheduler } from 'core/util/scheduler';
import { logger } from 'core/logging/logger';

@Injectable
export class SilencePlugin implements BotPlugin {
  readonly name = 'Silence';

  constructor(
    private readonly input: Input,
    private readonly filters: FilterFactory,
    private readonly scheduler: Scheduler,
  ) { }

  init(): void {
    this.input.filter(this.filters.hasRole('mod')).onText(/^!(!)?\s*(тихо|тишина|quiet|silence)\s*$/, this.handle);
  }

  private handle = ({ match }: TextMatch) => {
    const dur = match[1] != null ? duration(30, 'minutes') : duration(5, 'minutes');
    const endStr = moment().add(dur).toString();
    logger.info(`Activated silent mode until ${endStr}.`);
    const subscription = this.input.installGlobalFilter(
      this.filters.isAdmin(),
      `Silence until ${endStr}`);
    this.scheduler.schedule(() => {
      subscription.unsubscribe();
      logger.info(`Silent mode deactivated.`);
    }, dur);
  }
}
