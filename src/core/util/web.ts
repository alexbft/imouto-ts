import { Injectable } from 'core/di/injector';
import { Environment } from 'core/environment/environment';
import * as http from 'http';
import fetch, { Response } from 'node-fetch';
import { URL, URLSearchParams } from 'url';
import { Subscriber } from './subscriber';
import { WebException } from './web_exception';

export { WebException };

@Injectable
export class Web {
  constructor(private readonly environment: Environment) {}

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

  async getAsBrowser(url: string, options = { qs: {} }): Promise<string> {
    const newUrl = new URL(url);
    if (newUrl.search === '') {
      newUrl.search = new URLSearchParams(options.qs) as any;
    }

    const res = await fetch(newUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
      method: 'GET',
    });

    return res.text();
  }

  get(url: string, options = { qs: {} }): Promise<Response> {
    const newUrl = new URL(url);
    if (newUrl.search === '') {
      newUrl.search = new URLSearchParams(options.qs) as any;
    }
    return fetch(newUrl.toString(), {
      method: 'GET',
    });
  }
}
