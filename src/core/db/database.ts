import { Disposable } from 'core/util/disposable';
import * as sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { logger } from 'core/logging/logger';

const sqlite = sqlite3.verbose();

export class Database implements Disposable {
  private db?: sqlite3.Database;
  private connections: number = 0;
  debugLogging: boolean = false;

  constructor(private readonly fileName: string) { }

  open(): Promise<void> {
    this.connections += 1;
    if (this.connections === 1) {
      return this._open();
    }
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.connections -= 1;
    if (this.connections < 0) {
      throw new Error('Not opened');
    }
    if (this.connections === 0) {
      return this._close();
    }
    return Promise.resolve();
  }

  private _open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.db = new sqlite.Database(this.fileName, (err) => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
      this._close = promisify(this.db.close.bind(this.db));
    });
  }

  private _close(): Promise<void> {
    throw new Error('Not opened');
  }

  dispose(): Promise<void> {
    return this.close();
  }

  run(sql: string, args?: any[]): Promise<sqlite3.RunResult> {
    sql = sql.trim();
    if (this.debugLogging) {
      logger.debug('Executing SQL:', sql, args);
    }
    return new Promise<sqlite3.RunResult>((resolve, reject) => {
      this.db!.run(sql, args, function (err) {
        if (err != null) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  all(sql: string, args?: any[]): Promise<any[]> {
    sql = sql.trim();
    if (this.debugLogging) {
      logger.debug('Querying SQL:', sql, args);
    }
    return new Promise<any[]>((resolve, reject) => {
      this.db!.all(sql, args, function (err, rows) {
        if (err != null) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  get(sql: string, args?: any[]): Promise<any> {
    sql = sql.trim();
    if (this.debugLogging) {
      logger.debug('Querying SQL:', sql, args);
    }
    return new Promise<any>((resolve, reject) => {
      this.db!.get(sql, args, function (err, row) {
        if (err != null) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}
