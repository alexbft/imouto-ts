import * as PropertiesReader from 'properties-reader';

import { Provider, provide } from "core/di/provider";
import { logger } from 'core/logging/logger';
import { AuthToken, GoogleKey, GoogleCx, ExchangeKey, UserId, RoleMap, OpenWeatherMapKey, CmcKey, OpenAiKey, BannedChats } from "core/config/keys";
import { Injectable } from 'core/di/injector';
import { exists, readFile } from 'core/util/misc';

const configFileName = __dirname + '/../../../../config/main.config';

@Injectable
export class ConfigLoader {
    async load(): Promise<Provider[]> {
        logger.info('Reading configuration...');
        if (!await exists(configFileName)) {
            throw new Error('Configuration file not found: ' + configFileName);
        }
        const configText = await readFile(configFileName);
        const properties: PropertiesReader.Reader = (PropertiesReader as any)(null);
        properties.read(configText.toString());

        const logLevel = properties.getRaw('loglevel');
        if (logLevel != null) {
            logger.level = logLevel;
        }

        const authToken = properties.getRaw('token');
        if (authToken == null) {
            throw new Error('No auth token in configuration file');
        }
        const userId = Number(authToken.split(':')[0]);

        const roleMap: Map<string, number[]> = new Map();
        for (let key of Object.keys(properties.getAllProperties())) {
            if (key.startsWith('role_')) {
                roleMap.set(key.substring(5), this.getIdList(properties.getRaw(key)));
            }
        }

        const bannedChats = new Set(this.getIdList(properties.getRaw('banned_chats')));

        const googleKey = properties.getRaw('googlekey');
        const googleCx = properties.getRaw('googlecx');
        const exchangeKey = properties.getRaw('exchangekey');
        const openWeatherMapKey = properties.getRaw('openweathermapkey');
        const cmcKey = properties.getRaw('cmckey');
        const openAiKey = properties.getRaw('openaikey');

        logger.wipeMap.set('AuthToken', authToken);
        if (googleKey != null) {
            logger.wipeMap.set('GoogleKey', googleKey);
        }
        if (googleCx != null) {
            logger.wipeMap.set('GoogleCx', googleCx);
        }
        if (exchangeKey != null) {
            logger.wipeMap.set('ExchangeKey', exchangeKey);
        }
        if (openWeatherMapKey != null) {
            logger.wipeMap.set('OpenWeatherMapKey', openWeatherMapKey);
        }
        if (openAiKey != null) {
            logger.wipeMap.set('OpenAiKey', openAiKey);
        }

        return [
            provide(AuthToken, { useValue: authToken }),
            provide(UserId, { useValue: userId }),
            provide(GoogleKey, { useValue: googleKey }),
            provide(GoogleCx, { useValue: googleCx }),
            provide(ExchangeKey, { useValue: exchangeKey }),
            provide(RoleMap, { useValue: roleMap }),
            provide(OpenWeatherMapKey, { useValue: openWeatherMapKey }),
            provide(CmcKey, { useValue: cmcKey }),
            provide(OpenAiKey, { useValue: openAiKey }),
            provide(BannedChats, { useValue: bannedChats }),
        ];
    }

    private getIdList(s: string | null): number[] {
        if (s == null || s.trim() === '') {
            return [];
        }
        return s.split(',').map(s => parseInt(s.trim(), 10));
    }
}
