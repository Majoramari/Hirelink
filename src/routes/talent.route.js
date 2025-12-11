import { Router } from "express";
import { authController, talentController } from "../controllers/index.js";
import requireAuth from "../middleware/requireAuth.js";
import { uploadAvatar, uploadResume } from "../middleware/upload.js";
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

router.put(
	"/avatar",
	requireAuth,
	uploadAvatar.single("avatar"),
	talentController.updateFile,
);
router.put(
	"/resume",
	requireAuth,
	uploadResume.single("resume"),
	talentController.updateFile,
);
export default router;
