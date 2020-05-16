import { AssertionError } from "assert";
import { ChildProcess, spawn as pspawn } from "child_process";

export interface ISpawnOptions {
  cwd?: string;
  env?: any;
  stdio?: any;
  detached?: boolean;
  uid?: number;
  gid?: number;
  stream?: string;
  shell?: boolean | string;
}

export interface ISpawnFunction {
  callback: (data?: string) => boolean | void;
  type: string;
  description: string;
  expected?: string | RegExp;
}

export class SpawnChain {
  private command: string;
  private args: string[];
  private options: ISpawnOptions;
  private queue: ISpawnFunction[];
  private process: ChildProcess;

  constructor(command: string, args: string[], options: ISpawnOptions) {
    this.command = command;
    this.args = args;
    this.options = options;
    this.queue = [];
  }

  public expect(expectation: string | RegExp): SpawnChain {
    this.queue.push({
      callback: (data: string): boolean => {
        if (typeof expectation === "string") {
          return data.indexOf(expectation) > -1;
        }
        return expectation.test(data);
      },
      description: `[expect] ${expectation}`,
      expected: expectation,
      type: "expect",
    });

    return this;
  }

  public wait(expectation: string | RegExp, callback = (_: string) => { /* noop */ }): SpawnChain {
    this.queue.push({
      callback: (data: string): boolean => {
        let match = false;
        if (typeof expectation === "string") {
          match = data.indexOf(expectation) > -1;
        } else {
          match = expectation.test(data);
        }
        if (match) {
          callback(data);
        }
        return match;
      },
      description: `[wait] ${expectation}`,
      type: "wait",
    });

    return this;
  }

  public sendline(line: string): SpawnChain {
    const self = this;
    this.queue.push({
      callback: (): void => { self.process.stdin.write(`${line}\n`); },
      description: `[sendline] ${line}`,
      type: "sendline",
    });

    return this;
  }

  public sendEof(): SpawnChain {
    const self = this;
    this.queue.push({
      callback: (): void => { self.process.stdin.destroy(); },
      description: `[sendEof]`,
      type: "eof",
    });

    return this;
  }

  public run(callback: (err?: Error, output?: string[], exit?: string | number) => void): ChildProcess {
    const self = this;
    let failed = false;
    let stdout: string[] = [];

    function onError(err: Error, kill?: boolean) {
      if (kill) {
        try {
          self.process.kill();
        } catch (ex) { /* noop */ }
      }
      if (failed) {
        return;
      }
      failed = true;
      callback(err);
    }

    function evalQueue(previousType: string, data?: string): Error | undefined {
      if (typeof data === "undefined") {
        return;
      }

      const currentFn = self.queue[0];
      if (!currentFn || ((previousType === "expect" || previousType === "wait") && currentFn.type === "expect")) {
        return;
      }

      switch (currentFn.type) {
        case "expect":
          self.queue.shift();
          if (currentFn.callback(data)) {
            return evalQueue("expect", data);
          }

          const message = (typeof currentFn.expected === "string") ? "to contain" : "to match";
          return new AssertionError({
            actual: data,
            expected: currentFn.expected,
            message: `expected ${data} ${message} ${currentFn.expected}`,
          });
        case "wait":
          if (currentFn.callback(data)) {
            self.queue.shift();
            return evalQueue("wait", data);
          }
          return;
        default:
          self.queue.shift();
          currentFn.callback();
          const nextFn = self.queue[0];
          if (nextFn && ["expect", "wait"].indexOf(nextFn.type) === -1) {
            return evalQueue(currentFn.type, data);
          }
          return;
      }
    }

    function handleData(data: string) {
      data = data.toString().replace(/\u001b\[\d{0,2}m/g, "");
      const lines = data.split("\n").filter((line) => line.length > 0);
      stdout = stdout.concat(lines);

      while (lines.length > 0) {
        const err = evalQueue("start", lines.shift());
        if (err) {
          onError(err, true);
          break;
        }
      }
    }

    function flushQueue(): boolean {
      const remainingQueue = self.queue.slice();
      const currentFn = self.queue.shift() as ISpawnFunction;
      const lastLine = stdout[stdout.length - 1];

      if (!lastLine) {
        onError(new AssertionError({
          actual: [],
          expected: remainingQueue.map((fn) => fn.description),
          message: `Child exited with no output.`,
        }));
        return false;
      } else if (self.queue.length > 0) {
        onError(new AssertionError({
          actual: [],
          expected: remainingQueue.map((fn) => fn.description),
          message: `Expecting more output when child exited.`,
        }));
        return false;
      } else if (currentFn && currentFn.type === "sendline") {
        onError(new Error("Cannot call sendline after the process has exited"));
        return false;
      } else if (currentFn && currentFn.type === "wait" || currentFn.type === "expect") {
        if (currentFn.callback(lastLine) !== true) {
          const message = (typeof currentFn.expected === "string") ? "to contain" : "to match";
          onError(new AssertionError({
            actual: lastLine,
            expected: currentFn.expected,
            message: `expected ${lastLine} ${message} ${currentFn.expected}`,
          }));
          return false;
        }
      }
      return true;
    }

    const { stream, ...options } = self.options;
    self.process = pspawn(self.command, self.args, options);

    self.process[stream || "stdout"].on("data", handleData);
    self.process.on("error", onError);
    self.process.on("close", (code: number, signal: string) => {
      if (self.queue.length && !flushQueue()) {
        return;
      }
      callback(undefined, stdout, signal || code);
    });

    return self.process;
  }
}

export function spawn(command: string, args: string[] = [], options: ISpawnOptions = {}): SpawnChain {
  return new SpawnChain(command, args, options);
}
