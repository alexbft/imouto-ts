import { Injectable } from 'core/di/injector';
import { HasRoleFilter } from 'core/filter/has_role_filter';
import { UserService } from 'core/tg/user_service';
import { BannedFilter } from 'core/filter/banned_filter';

@Injectable
export class FilterFactory {
  constructor(private readonly userService: UserService) { }

  hasRole(role: string): HasRoleFilter {
    return new HasRoleFilter(this.userService, role);
  }

  isAdmin(): HasRoleFilter {
    return this.hasRole('admin');
  }

  isNotBanned(): BannedFilter {
    return new BannedFilter(this.userService);
  }
}
