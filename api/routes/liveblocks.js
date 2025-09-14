import express from 'express';
import { Liveblocks } from "@liveblocks/node";
import dotenv from 'dotenv';
import authMiddleware from "../middleware/authMiddleware.js";
dotenv.config();
const router = express.Router();

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY
});

import authMiddleware from "../middleware/authMiddleware.js";

router.post("/liveblocks-auth", authMiddleware, async (req, res) => {
  const { room } = req.body;
  
  const session = liveblocks.prepareSession(req.user.id.toString(), {
    userInfo: {
      name: req.user.displayName,
      picture: req.user.avatar,
    },
  });

  session.allow(room, session.FULL_ACCESS);

  const { token } = await session.authorize();
  res.json({ token });
});

export default router;