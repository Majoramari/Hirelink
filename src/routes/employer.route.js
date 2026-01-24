/**
 * Employer routes.
 *
 * Exposes employer-only endpoints for:
 * - profile management
 * - logo upload/fetch/delete
 * - job create, list, update, and delete operations (owned by the authenticated employer)
 * - listing job applications and updating application status
 *
 * Notes:
 * - All endpoints here require authentication and `EMPLOYER` role.
 * - Upload endpoints use Multer + Cloudinary storage.
 *
 * References:
 * - Express Router: https://expressjs.com/en/guide/routing.html
 * - OWASP Access Control: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
 */

import { Router } from "express";
import {
	applicationsController,
	authController,
	employerController,
	jobsController,
} from "../controllers/index.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";
import { uploadAvatar } from "../middleware/upload.js";
import validate from "../middleware/validate.js";
import { employerProfileSchema } from "../validators/employer.validator.js";
import {
	createJobSchema,
	removeJobLanguageSchema,
	removeJobSkillSchema,
	updateApplicationStatusSchema,
	updateJobSchema,
	upsertJobLanguageSchema,
	upsertJobSkillSchema,
} from "../validators/jobs.validator.js";

const router = Router();

router.get(
	"/profile",
	requireAuth,
	requireRole("EMPLOYER"),
	authController.getCurrent,
);
router.put(
	"/profile",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(employerProfileSchema),
	employerController.updateProfile,
);

router.put(
	"/logo",
	requireAuth,
	requireRole("EMPLOYER"),
	uploadAvatar.single("logo"),
	employerController.updateLogo,
);
router.get(
	"/logo",
	requireAuth,
	requireRole("EMPLOYER"),
	employerController.getLogo,
);
router.delete(
	"/logo",
	requireAuth,
	requireRole("EMPLOYER"),
	employerController.deleteLogo,
);

router.get(
	"/jobs",
	requireAuth,
	requireRole("EMPLOYER"),
	jobsController.listEmployerJobs,
);
router.post(
	"/jobs",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(createJobSchema),
	jobsController.createEmployerJob,
);
router.get(
	"/jobs/:jobId",
	requireAuth,
	requireRole("EMPLOYER"),
	jobsController.getEmployerJob,
);
router.put(
	"/jobs/:jobId",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(updateJobSchema),
	jobsController.updateEmployerJob,
);

router.post(
	"/jobs/:jobId/skills",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(upsertJobSkillSchema),
	jobsController.upsertEmployerJobSkill,
);
router.delete(
	"/jobs/:jobId/skills",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(removeJobSkillSchema),
	jobsController.removeEmployerJobSkill,
);

router.post(
	"/jobs/:jobId/languages",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(upsertJobLanguageSchema),
	jobsController.upsertEmployerJobLanguage,
);
router.delete(
	"/jobs/:jobId/languages",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(removeJobLanguageSchema),
	jobsController.removeEmployerJobLanguage,
);
router.delete(
	"/jobs/:jobId",
	requireAuth,
	requireRole("EMPLOYER"),
	jobsController.deleteEmployerJob,
);

router.get(
	"/jobs/:jobId/applications",
	requireAuth,
	requireRole("EMPLOYER"),
	applicationsController.listEmployerJobApplications,
);
router.patch(
	"/applications/:applicationId",
	requireAuth,
	requireRole("EMPLOYER"),
	validate(updateApplicationStatusSchema),
	applicationsController.updateStatus,
);

export default router;
