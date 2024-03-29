import { Server, Socket } from "socket.io";
import https from 'https'
import fs from 'fs'
import "dotenv/config";
import app from "./app";
import MonitorService from "./modules/monitor/monitor-service";

const certificateOptions = {
  key: fs.readFileSync(process.env.CERT_KEY_PATH || "cert/localhost-key.pem" ),
  cert: fs.readFileSync(process.env.CERT_PATH || "cert/localhost.pem"),
};

const server = https.createServer(certificateOptions, app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: "*",
  },
});

const monitor = new MonitorService();

io.on("connection", (socket: Socket) => {
  monitor.handleNewConnection(socket.id);
  console.info(`User connected: ${socket.id}`);
});

const PORT = process.env.PORT ?? 3000;

server.listen(PORT, () => console.log(`Server is running on https://localhost:${PORT}\n\n`));


monitor.setFilter([]) // ['node', 'python', 'java']
monitor.start(process.env.MONITOR_DELAY || '1');

export { io };
