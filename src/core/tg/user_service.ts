import { Injectable, Inject } from 'core/di/injector';
import { RoleMap } from 'core/config/keys';
import { reverseMultiMap } from 'core/util/misc';
import { User } from 'node-telegram-bot-api';

@Injectable
export class UserService {
  private rolesByUser: Map<number, string[]> = new Map();

  constructor(@Inject(RoleMap) roleMap: Map<string, number[]>) {
    this.rolesByUser = reverseMultiMap(roleMap);
  }

  hasRole(user: User, role: string): boolean {
    const roles = this.rolesByUser.get(user.id);
    return roles != null && roles.indexOf(role) != -1;
  }
}
