import { Router } from "express";
import { env } from "../config.js";

const router = Router();

const getSingleQueryParam = (value: unknown): string | undefined => {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
};

router.get("/webhook", (req, res) => {
  try {
    const hubMode = getSingleQueryParam(req.query["hub.mode"]);
    const hubVerifyToken = getSingleQueryParam(req.query["hub.verify_token"]);
    const hubChallenge = getSingleQueryParam(req.query["hub.challenge"]);
    const expectedVerifyToken = process.env.META_VERIFY_TOKEN ?? env.META_VERIFY_TOKEN;

    if (!expectedVerifyToken) {
      console.error("META_VERIFY_TOKEN is not configured");
      return res.status(500).json({ message: "Webhook verification is not configured" });
    }

    if (!hubMode || !hubVerifyToken || !hubChallenge) {
      return res.status(400).json({ message: "Missing webhook verification query params" });
    }

    if (hubMode === "subscribe" && hubVerifyToken === expectedVerifyToken) {
      return res.status(200).type("text/plain").send(hubChallenge);
    }

    return res.sendStatus(403);
  } catch (error) {
    console.error("Error verifying Meta webhook:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/webhook", (req, res) => {
  try {
    console.log("Meta webhook payload:", req.body);
    return res.status(200).type("text/plain").send("EVENT_RECEIVED");
  } catch (error) {
    console.error("Error handling Meta webhook:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
