import { registerSchema } from "../Validation/auth.validation.js";
import { userRegister } from "../Services/auth.service.js";

export const register = async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
     if (error) return res.status(400).json({ message: error.message });

    const { user, token } = await userRegister(req.body);

    res.cookie("token", token, {
      httpOnly: true,
      secure: false, //  true  هنخليه  في الإنتاج
      sameSite: "strict",
    });

    res.status(201).json({
      message: "User registered successfully",
      user,
    });
  } catch (err) {
    next(err);
  }
     
  
};
