import bcrypt from "bcryptjs";


export const hash = async ({plainText = "", saltRound = 12} ) => {
    return await bcrypt.hash(plainText , saltRound);
};


export const compare = async ({plainText = "" , hash = ""}) => {
    return await bcrypt.compare(plainText , hash);
};