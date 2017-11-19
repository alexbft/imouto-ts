// import { Stream, generate } from 'most';
// import { Completer } from './completer';

// export class StreamController<T> {
//   private queue: T[] = [];
//   private signal: Completer<void> = new Completer<void>();
//   private isClosed: boolean = false;
//   readonly stream: Stream<T>;

//   constructor() {
//     this.stream = generate(this.generator.bind(this));
//   }

//   private async *generator() {
//     while (!this.isClosed) {
//       await this.signal.promise;
//       this.signal = new Completer<void>();
//       const data = this.queue;
//       this.queue = [];
//       yield* data;
//     }
//   }

//   add(event: T): void {
//     this.queue.push(event);
//     this.signal.resolve();
//   }

//   addError(error: any): void {
//     this.signal.reject(error);
//   }

//   close(): void {
//     this.isClosed = true;
//     this.signal.resolve();
//   }
// }
