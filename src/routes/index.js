import { Router } from "express";
import authRoute from "./auth.route.js";
import talentRoute from "./talent.route.js";

const router = Router();

router.use("/auth", authRoute);
router.use("/talent", talentRoute);

export default router;
