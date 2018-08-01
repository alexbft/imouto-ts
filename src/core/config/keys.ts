import { InjectionToken } from 'core/di/injection_token';

export const GoogleKey = new InjectionToken<string | null>('GoogleKey');
export const GoogleCx = new InjectionToken<string | null>('GoogleCx');
export const AuthToken = new InjectionToken<string>('AuthToken');
export const ExchangeKey = new InjectionToken<string | null>('ExchangeKey');
export const UserId = new InjectionToken<number>('UserId');
export const RoleMap = new InjectionToken<Map<string, number[]>>('RoleMap');
export const OpenWeatherMapKey = new InjectionToken<string | null>('OpenWeatherMapKey');
