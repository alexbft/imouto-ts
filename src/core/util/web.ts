import { Injectable } from 'core/di/injector';
import { Environment } from 'core/environment/environment';
import * as http from 'http';
import * as https from 'https';
import { URL, URLSearchParams } from 'url';
import { Subscriber } from 'core/util/subscriber';
import { WebException } from 'core/util/web_exception';
import { logger } from 'core/logging/logger';

export { WebException };

export function toUrl(url: string|URL, searchParams?: any): URL {
  const url_ = url instanceof URL ? url : new URL(url);
  if (searchParams != null) {
    url_.search = new URLSearchParams(searchParams) as any;
  }
  return url_;
}

export function requestOptionsFromUrl(url: URL): http.RequestOptions {
  return {
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname + url.search
  };
}

@Injectable
export class Web {
  constructor(private readonly environment: Environment) {}

  request(options: http.RequestOptions): http.ClientRequest {
    if (options.protocol === 'https') {
      return https.request(options);
    } else {
      return http.request(options);
    }
  }

  sendRequest(request: http.ClientRequest): Promise<http.IncomingMessage> {
    return new Promise<http.IncomingMessage>((resolve, reject) => {
      const subscriber = new Subscriber(request, this.environment);

      subscriber.on('error', (err: any) => {
        if (!request.aborted) {
          reject(err);
        }
        subscriber.removeListeners();
      });
      subscriber.on('abort', () => {
        reject(new WebException('aborted'));
      });
      subscriber.on('response', (res: http.IncomingMessage) => {
        subscriber.removeListeners();
        resolve(res);
      });
      subscriber.onDispose(() => {
        logger.verbose('Aborted: sendRequest');
        request.abort();
      });

      request.end();
    });
  }

  readResponseRaw(request: http.ClientRequest, response: http.IncomingMessage): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const subscriber = new Subscriber(response, this.environment);
      let buffer = '';

      subscriber.on('error', (err: any) => {
        if (!request.aborted) {
          reject(err);
        }
        subscriber.removeListeners();
      });
      subscriber.on('aborted', () => {
        reject(new WebException('aborted'));
      });
      subscriber.on('data', (chunk) => {
        buffer += chunk;
      });
      subscriber.on('end', () => {
        subscriber.removeListeners();
        resolve(buffer);
      });
      subscriber.onDispose(() => {
        logger.verbose('Aborted: readResponseRaw');
        request.abort();
      });
    });
  }

  readResponse(request: http.ClientRequest, response: http.IncomingMessage): Promise<string> {
    if (response.statusCode !== 200) {
      response.resume();
      return Promise.reject(new WebException(`HTTP Error ${response.statusCode}: ${response.statusMessage}`));
    }
    return this.readResponseRaw(request, response);
  }

  async readResponseJson(request: http.ClientRequest, response: http.IncomingMessage): Promise<any> {
    if (response.statusCode !== 200) {
      response.resume();
      throw new WebException(`HTTP Error ${response.statusCode}: ${response.statusMessage}`);
    }
    const contentType = response.headers['content-type'] as string;
    if (!/^application\/json/.test(contentType)) {
      response.resume();
      throw new WebException(`Expected application/json but got ${contentType}`);
    }
    const rawResponse = await this.readResponseRaw(request, response);
    return JSON.parse(rawResponse);
  }

  async fetch(request: http.ClientRequest): Promise<string> {
    return this.readResponse(request, await this.sendRequest(request));
  }

  async fetchJson(request: http.ClientRequest): Promise<any> {
    return this.readResponseJson(request, await this.sendRequest(request));
  }

  getAsBrowser(url: string|URL, searchParams?: any): Promise<string> {
    const options = requestOptionsFromUrl(toUrl(url, searchParams));
    options.headers = {
      'User-Agent': 'Mozilla/5.0',
    };
    return this.fetch(this.request(options));
  }

  get(url: string|URL, searchParams?: any): Promise<string> {
    return this.fetch(this.request(requestOptionsFromUrl(toUrl(url, searchParams))));
  }

  getJson(url: string|URL, searchParams?: any): Promise<any> {
    return this.fetchJson(this.request(requestOptionsFromUrl(toUrl(url, searchParams))));
  }
}
