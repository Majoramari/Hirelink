import authRouter from "./Controllers/auth.controller.js";
import userRouter from "./Controllers/user.controller.js";
import adminRouter from "./Controllers/admin.controller.js";
import companyRouter from "./Controllers/Company.controller.js";

import dotenv from "dotenv";
dotenv.config();
import prisma , { connectDB } from "../prisma/client.js";


//import connectDB from "./DB/connection.js";
import { globalErrorHanndler } from "./Utils/errorHandling.utils.js";

const bootstrap = async (app , express) => {
    
    dotenv.config();
    app.use(express.json());

    //connect to database
    connectDB();
    
    //routes
    app.use("/api/auth" , authRouter);
    app.use("/api/user" , userRouter);
    app.use("/api/admin" , adminRouter);
    app.use("/api/company" , companyRouter);

   
    //404 error not found
    app.all("/*dummy" , (req , res, next) => {
      return next(new Error("Not Found Handler!!", {cause : 404}));
        
    });
    
    //global error handler middleware
    app.use(globalErrorHanndler);

}

export default bootstrap;