import { Router, Request, Response } from "express";
const router = Router();

router.use("/", (_req: Request, res: Response) => {
  res.send("Process Monitor API - 0.1");
});

export default router;
