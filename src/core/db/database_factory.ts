import { Database } from 'core/db/database';

export class DatabaseFactory {
  private _instance?: Database;

  constructor(private readonly fileName: string) { }

  create(): Database {
    if (this._instance == null) {
      this._instance = new Database(this.fileName);
    }
    return this._instance;
  }
}
