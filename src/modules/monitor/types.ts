export type TopProcess = {
    pid: string
    time: string
    command: string
}

export type ProcessEventItem = {
    id: string
    name: string
    date: Date
}

export type TopColumn = {
  pid: number;
  time: number;
  command: number;
};