import { Router } from "express";
import { createChannel } from "./channels.controller.js";

const channelsRouter = Router();

channelsRouter.post("/", createChannel);

export default channelsRouter;
