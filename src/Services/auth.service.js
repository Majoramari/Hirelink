import { hash } from "../Utils/hash.utils.js";
import prisma from "../../prisma/client.js";
import { generateToken } from "../Utils/jwt.utils.js";




export const userRegister= async ({name, email, password, phone, role}) => { //هبعت ال req.body في controller
    
    const userIsExist = await prisma.user.findUnique({where : {email}});

    //check if email is already exist
    if(userIsExist){
        throw { message: "Email already exist", statusCode: 409 }; // throw object مع statusCode

    };


    //hash password
    const hashedPassword = await hash({plainText : password});

    //create user object & and add to the database    
    const newUser = await prisma.user.create(
        {
            data : { name, email, password: hashedPassword, phone, role},
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            createdAt: true,
            isActive: true,
            emailVerified: true


        },
    
    });
    //generate Token
    const token = generateToken({ 
        id: newUser.id, 
        role: newUser.role 
    });


    return {
        user : newUser,
        token
    };

};


//Login function



//logout function










