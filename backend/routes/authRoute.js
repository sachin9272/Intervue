import express from "express";
const router = express.Router();
import { teacherLogin } from "../controllers/authController.js";

router.post("/", teacherLogin);

export default router;
