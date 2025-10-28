import { Router } from "express";
import * as authService from "../Services/auth.service.js";



const router = Router();
router.post("/signup", authService.Signup);

export default router;