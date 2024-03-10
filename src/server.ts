import { Server } from "socket.io";
import https from 'https'
import fs from 'fs'
import "dotenv/config";
import app from "./app";
const certificateOptions = {
  key: fs.readFileSync(process.env.CERT_KEY_PATH || "cert/localhost-key.pem" ),
  cert: fs.readFileSync(process.env.CERT_PATH || "cert/localhost.pem"),
};

const server = https.createServer(certificateOptions, app);
const PORT = process.env.PORT ?? 3000;

server.listen(PORT, () => console.log(`Server is running on https://localhost:${PORT}\n\n`));

