import { Injectable } from 'core/di/injector';
import * as http from 'http';
import * as https from 'https';
import { URL, URLSearchParams } from 'url';
import { WebException } from 'core/util/web_exception';
import { logger } from 'core/logging/logger';

export { WebException };

export function toUrl(url: string | URL, searchParams?: any): URL {
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

// TODO: handle redirects

@Injectable
export class Web {
  request(options: http.RequestOptions): http.ClientRequest {
    if ((options.protocol || '').toLowerCase() === 'https:') {
      return https.request(options);
    } else {
      return http.request(options);
    }
  }

  sendRequest(request: http.ClientRequest): Promise<http.IncomingMessage> {
    return new Promise<http.IncomingMessage>((resolve, reject) => {
      request.on('error', (err: any) => {
        reject(err);
      });
      request.on('response', (res: http.IncomingMessage) => {
        resolve(res);
      });

      request.end();
    });
  }

  async readResponseRawString(response: http.IncomingMessage): Promise<string> {
    const rawResponse = await this.readResponseRaw(response);
    return rawResponse.toString('utf8');
  }

  readResponseRaw(response: http.IncomingMessage): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      let buffer: Buffer[] = [];

      response.on('error', (err: any) => {
        reject(err);
      });
      response.on('data', (chunk: Buffer) => {
        buffer.push(chunk);
      });
      response.on('end', () => {
        resolve(Buffer.concat(buffer));
      });
    });
  }

  async readResponse(response: http.IncomingMessage): Promise<string> {
    const rawResponse = await this.readResponseRawString(response);
    if (response.statusCode !== 200) {
      logger.info(`Response {${rawResponse}}`);
      throw new WebException(`HTTP Error ${response.statusCode}: ${response.statusMessage}`);
    }
    return rawResponse;
  }

  async readResponseJson(response: http.IncomingMessage): Promise<any> {
    const rawResponse = await this.readResponseRawString(response);
    if (response.statusCode !== 200) {
      logger.info(`Response {${rawResponse}}`);
      throw new WebException(`HTTP Error ${response.statusCode}: ${response.statusMessage}`);
    }
    const contentType = response.headers['content-type'] as string;
    if (!/^application\/json/.test(contentType)) {
      logger.info(`Response {${rawResponse}}`);
      throw new WebException(`Expected application/json but got ${contentType}`);
    }
    return JSON.parse(rawResponse);
  }

  async readResponseBuffer(response: http.IncomingMessage): Promise<Buffer> {
    if (response.statusCode !== 200) {
      const rawResponse = await this.readResponseRawString(response);
      logger.debug(`Response {${rawResponse}}`);
      throw new WebException(`HTTP Error ${response.statusCode}: ${response.statusMessage}`);
    }
    return this.readResponseRaw(response);
  }

  async fetch(request: http.ClientRequest): Promise<string> {
    return this.readResponse(await this.sendRequest(request));
  }

  async fetchJson(request: http.ClientRequest): Promise<any> {
    return this.readResponseJson(await this.sendRequest(request));
  }

  async fetchBuffer(request: http.ClientRequest): Promise<Buffer> {
    return this.readResponseBuffer(await this.sendRequest(request));
  }

  getAsBrowser(url: string | URL, searchParams?: any): Promise<string> {
    const _url = toUrl(url, searchParams);
    logger.debug('getAsBrowser:', _url.href);
    const options = requestOptionsFromUrl(_url);
    options.headers = {
      'User-Agent': 'Mozilla/5.0',
    };
    return this.fetch(this.request(options));
  }

  get(url: string | URL, searchParams?: any): Promise<string> {
    const _url = toUrl(url, searchParams);
    logger.debug('getJson:', _url.href);
    return this.fetch(this.request(requestOptionsFromUrl(_url)));
  }

  getJson(url: string | URL, searchParams?: any): Promise<any> {
    const _url = toUrl(url, searchParams);
    logger.debug('getJson:', _url.href);
    return this.fetchJson(this.request(requestOptionsFromUrl(_url)));
  }

  getBuffer(url: string | URL, searchParams?: any): Promise<Buffer> {
    const _url = toUrl(url, searchParams);
    logger.debug('getJson:', _url.href);
    return this.fetchBuffer(this.request(requestOptionsFromUrl(_url)));
  }
}
