import { spawn } from "child_process";
import readline from "readline";
import {  ProcessEventItem, TopColumn, TopProcess } from "./types";
import { io } from "../../server";

export default class MonitorService {
  private reader?: readline.Interface;
  private filters: string[] = [];
  private previous: TopProcess[] = [];
  private current: TopProcess[] = [];
  private topColumn: TopColumn = {
    command: -1,
    pid: -1,
    time: -1,
  };

  public async start(delay: number = 1) {
    console.log("Starting Process Monitor Service...");
    this.stop();

    const topParams: string[] = [];

    switch (process.platform) {
      case "darwin":
        topParams.push("-s", delay < 1 ? "1" : delay.toFixed());
        break;
      case "linux":
        topParams.push("-b", "-d", String(delay));
        break;
      default:
        console.error("Platform not supported for top command");
        break;
    }

    const topProcess = spawn("top", topParams);
    this.reader = readline.createInterface({ input: topProcess.stdout });
    this.reader.on("line", this.readLine);
  }

  public setFilter(filters: string[]) {
    this.filters = filters;
  }

  private processLine(line: string): TopProcess | undefined {
    if (this.topColumn.pid === -1) {
      this.populateColumns(line);
    } else if (line.match(/^\s*\d+\s+/)) {
      const words = line.split(/\s+/);
      const pid = words[this.topColumn.pid];
      const time = words[this.topColumn.time];
      const command = words[this.topColumn.command];
      if (!pid || !time || !command) return undefined;
      return { pid, time, command };
    }
    return undefined;
  }

  private readLine = (line: string) => {
    this.processLine(line);
    if (this.isHeader(line)) {
      this.compare();
      this.previous = this.current;
      this.current = [];
    } else {
      const item = this.processLine(line);
      if (item && !this.isDuplicated(item)) {
        this.current.push(item);
      }
    }
  };

  private isHeader(line: string): boolean {
    return !!line.match(/^(?=.*\bPID\b)(?=.*\bCOMMAND\b)(?=.*\bTIME\+?\b).*/);
  }

  private isDuplicated(item: TopProcess): boolean {
    return this.current.some((i) => i.pid === item.pid);
  }

  private populateColumns(line: string) {
    if (this.topColumn.pid !== -1) return;
    const match = !!line.match(
      /^(?=.*\bPID\b)(?=.*\bCOMMAND\b)(?=.*\bTIME\+?\b).*/
    );
    if (match) {
      const words = line.split(/\s+/);
      words.forEach((word, index) => {
        if (word === "PID") this.topColumn.pid = index;
        if (word.includes("TIME")) this.topColumn.time = index;
        if (word === "COMMAND") this.topColumn.command = index;
      });
    }
  }

  private compare() {
    if (this.previous.length) {
      const removedProcess = this.previous
        .filter((p) => !this.current.find((c) => c.pid === p.pid))
        .filter((p) =>
          this.filters.length
            ? this.filters.some((filter) => p.command.includes(filter))
            : true
        )
        .map((process) => ({
          id: process.pid,
          date: new Date(),
          name: process.command,
        }));

      const newProcess = this.current
        .filter((c) => !this.previous.find((p) => p.pid === c.pid))
        .filter((p) =>
          this.filters.length
            ? this.filters.some((filter) => p.command.includes(filter))
            : true
        )
        .map((process) => ({
          id: process.pid,
          date: new Date(),
          name: process.command,
        }));

      if (removedProcess.length) this.emitEvent("removedProcess", removedProcess);
      if (newProcess.length) this.emitEvent("newProcess", newProcess);

    }
  }

  private emitEvent(eventName: string, data: ProcessEventItem[]) {
    io.emit(eventName, data);
    console.log(eventName, data)
  }

  private stop() {
    if (this.reader) {
      this.reader.close();
      this.current = [];
      this.previous = [];
    }
  }
}
