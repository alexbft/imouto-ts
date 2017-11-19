export class TgException extends Error {
  constructor(message?: string, parameters?: any) {
    super(parameters == null ?
        `TgException: ${message}` :
        `TgException: ${message} (${JSON.stringify(parameters)})`);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
