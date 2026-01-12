/**
 * Talent application routes.
 *
 * Provides endpoints for the authenticated talent to list their applications.
 *
 * References:
 * - Express Router: https://expressjs.com/en/guide/routing.html
 */

import { Router } from "express";
import { applicationsController } from "../controllers/index.js";
import requireAuth from "../middleware/requireAuth.js";
import requireRole from "../middleware/requireRole.js";

const router = Router();

router.get(
	"/applications",
	requireAuth,
	requireRole("TALENT"),
	applicationsController.list,
);

export default router;
