import { spawn, spawnSync } from "child_process";
import readline from "readline";
import {  ProcessEventItem, TopColumn, TopProcess } from "./types";
import { io } from "../../server";
import { isValidPositiveNumber } from "../../utils/number";

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

  public async start(delayStr: string = '1') {
    const delay = isValidPositiveNumber(delayStr) ? Number(delayStr) : 1;
    this.stop();

    const topParams: string[] = [];

    switch (process.platform) {
      case "darwin":
        topParams.push("-s", (delay < 1 && delay !== 0) ? "1" : delay.toFixed());
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

  public handleNewConnection(sessionId: string) {
      const process = this.current
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

      const processStartTime = this.getTimeFromProcessIds(
        process.map((p) => p.id)
      );

      const newProcess = process.map((p, i) => ({
        id: p.id,
        name: p.name,
        date: processStartTime[i] || p.date,
      }));

      if (newProcess.length) {
        this.emiEventTo(sessionId, "currentProcess", newProcess);
      }
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
    console.log("sending", eventName, data)
  }

  private emiEventTo(sessionId: string, eventName: string, data: ProcessEventItem[]) {
    io.to(sessionId).emit(eventName, data);
    console.log("sending to", sessionId, eventName, data)
  }

  private getTimeFromProcessIds(pidIds: string[]): Date[]  {
    const pidStrList = pidIds.join(",");
    const { stdout, error } = spawnSync("ps", [
      "-p",
      pidStrList,
      "-o",
      "lstart",
    ]);

    if (error || stdout.toString().trim() === "") {
      return []
    }

    const lines = stdout.toString().trim().split("\n");
    const startTimes: Date[] = [];

    for (let i = 1; i < lines.length; i++) {
      const startTimeStr = lines[i].trim()
      const startTime = new Date(startTimeStr);
      startTimes.push(startTime);
    }
    return startTimes;
  }

  private stop() {
    if (this.reader) {
      this.reader.close();
      this.current = [];
      this.previous = [];
    }
  }
}
