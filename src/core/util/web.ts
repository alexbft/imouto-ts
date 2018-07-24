import { Injectable } from 'core/di/injector';
import * as http from 'http';
import * as https from 'https';
import { URL, URLSearchParams } from 'url';
import { WebException } from 'core/util/web_exception';

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

// TODO: handle redirects && 400 error from TG

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

  readResponseRaw(response: http.IncomingMessage): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let buffer = '';

      response.on('error', (err: any) => {
        reject(err);
      });
      response.on('data', (chunk) => {
        buffer += chunk;
      });
      response.on('end', () => {
        resolve(buffer);
      });
    });
  }

  readResponse(response: http.IncomingMessage): Promise<string> {
    if (response.statusCode !== 200) {
      response.resume();
      return Promise.reject(new WebException(`HTTP Error ${response.statusCode}: ${response.statusMessage}`));
    }
    return this.readResponseRaw(response);
  }

  async readResponseJson(response: http.IncomingMessage): Promise<any> {
    if (response.statusCode !== 200) {
      response.resume();
      throw new WebException(`HTTP Error ${response.statusCode}: ${response.statusMessage}`);
    }
    const contentType = response.headers['content-type'] as string;
    if (!/^application\/json/.test(contentType)) {
      response.resume();
      throw new WebException(`Expected application/json but got ${contentType}`);
    }
    const rawResponse = await this.readResponseRaw(response);
    return JSON.parse(rawResponse);
  }

  async fetch(request: http.ClientRequest): Promise<string> {
    return this.readResponse(await this.sendRequest(request));
  }

  async fetchJson(request: http.ClientRequest): Promise<any> {
    return this.readResponseJson(await this.sendRequest(request));
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
