import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),       // الاسم مطلوب، من 3 لـ 50 حرف
  phone: Joi.string().min(10).max(15).optional(),     // رقم التليفون اختياري، ممكن يكون 10-15 رقم
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("APPLICANT", "COMPANY", "ADMIN" ).default("USER"),
  

  
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});