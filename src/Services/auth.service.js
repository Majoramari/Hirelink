import { PrismaClient } from "@prisma/client";
import { successResponse } from "../Utils/successResponse.utils.js";
import { hash } from "../Utils/hash.utils.js";

import prisma from "../../prisma/client.js";

//const prisma = new PrismaClient();


export const Signup = async (req , res, next) => {

    // //parse data from the body
    // const {name, email, password, phone, role, isActive, emailVerified} = req.body;

    // //check if email is already exist
    // if(await prisma.user.findUnique({where : {email}})){
    //     return next(new Error("Email already exist", {cause : 409})); //409 = conflict => dublicated entry in db
    // };


    // //hash password
    // const hashedPassword = await hash({plainText : password});

    // //create user object & and add to the database    
    // const newUser = await prisma.user.create(
    //     {
    //         data : 
    //         { 
    //         name,
    //         email, 
    //         password: hashedPassword,
    //         phone, 
    //         role, 
    //         isActive: isActive ?? true, //default active 
    //         emailVerified: emailVerified ?? false //default not verified
    //     },
    //     select: {
    //         id: true,
    //         name: true,
    //         email: true,
    //         phone: true,
    //         role: true,
    //         isActive: true,
    //         emailVerified: true
    //     },
    
    // });

    //send success response
    return successResponse({
        res, 
        statusCode : 201, 
        message : "User created successfully"
    });


};


//Login function







