import { Router } from "express";
import { createChannel } from "./channels.controller";

const channelsRouter = Router();

channelsRouter.post("/", createChannel);

export default channelsRouter;
