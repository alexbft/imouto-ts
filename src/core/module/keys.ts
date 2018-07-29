import { InjectionToken } from 'core/di/injection_token';
import { InputSource } from 'core/bot_api/input';

export const Unfiltered = new InjectionToken<InputSource>('Unfiltered');
