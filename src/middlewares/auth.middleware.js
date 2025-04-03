import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = async (req, res, next) => {
    try {
        const token =
            req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        console.log("Token:", token);

        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        console.log("Decoded Token:", decodedToken);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
        console.log("User found in middleware:", user);

        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        req.user = user;
        req._id = user._id;
        next();
    } catch (error) {
        console.error("Error in verifyJWT middleware:", error);
        throw new ApiError(401, error?.message || "Invalid access token");
    }
};

// export const verifyJWT = async (req, res, next) => {
//     try {
//         const token =
//             req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

//         console.log(token);
//         if (!token) {
//             throw new ApiError(401, "Unauthorized request");
//         }

//         const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//         const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

//         if (!user) {
//             throw new ApiError(401, "Invalid Access Token");
//         }

//         req.user = user;
//         next();
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid access token");
//     }
// };
