import { BannedChats } from 'core/config/keys';
import { Inject, Injectable } from 'core/di/injector';
import { BannedFilter } from 'core/filter/banned_filter';
import { HasRoleFilter } from 'core/filter/has_role_filter';
import { UserService } from 'core/tg/user_service';

@Injectable
export class FilterFactory {
    constructor(
        private readonly userService: UserService,
        @Inject(BannedChats) private readonly bannedChats: Set<number>,) { }

    hasRole(role: string): HasRoleFilter {
        return new HasRoleFilter(this.userService, role);
    }

    isAdmin(): HasRoleFilter {
        return this.hasRole('admin');
    }

    isNotBanned(): BannedFilter {
        return new BannedFilter(this.userService, this.bannedChats);
    }
}
