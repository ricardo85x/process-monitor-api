import express, {Express} from "express";
import cors from "cors";

import "dotenv/config";
import router from "./routes"

const app: Express = express();

app.use(express.json());
app.use(cors({ origin: "*", methods: "*" }));

app.use(router);

export default app;
