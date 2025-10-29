import { Router } from "express";
import { register } from "../Controllers/auth.controller.js";
import { registerSchema } from "../Validation/auth.validation.js";
import { validateBody } from "../Middlewares/validate.middleware.js";



const router = Router();

router.post("/register",validateBody(registerSchema) ,register);

export default router;
