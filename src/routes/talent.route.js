import { Router } from "express";
import { authController, talentController } from "../controllers/index.js";
import requireAuth from "../middleware/requireAuth.js";
import validate from "../middleware/validate.js";
import { talentProfileSchema } from "../validators/talent.validator.js";

const router = Router();
router.get("/profile", requireAuth, authController.getCurrent);
router.put(
	"/profile",
	requireAuth,
	validate(talentProfileSchema),
	talentController.updateProfile,
);

export default router;
