import { provide } from 'core/di/provider';
import { AuthToken } from './keys';

export const bindings = [
  provide(AuthToken, { useValue: '' })
];
