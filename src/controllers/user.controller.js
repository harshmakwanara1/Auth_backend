import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const generateAccessAndRefereshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token");
    }
};

const registerUser = async (req, res) => {
    const { email, username, password } = req.body;
    try {
        if ([email, username, password].some((field) => field?.trim() === "")) {
            throw new ApiError(400, "All fields are required");
        }

        const existedUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existedUser) {
            throw new ApiError(409, "User with email or username already exists");
        }

        const user = await User.create({
            username: username.toLowerCase(),
            email,
            password,
        });

        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }

        return res
            .status(201)
            .json(new ApiResponse(200, createdUser, "User registered Successfully"));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        // console.log(email);

        if (!(username || email)) {
            throw new ApiError(400, "username or email is required");
        }

        const user = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (!user) {
            throw new ApiError(404, "User does not exist");
        }

        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            throw new ApiError(401, "Invalid user credentials");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        const options = {
            httpOnly: true,
            secure: true,
        };

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { user: loggedInUser, accessToken, refreshToken },
                    "User logged in successfully"
                )
            );
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};

const logoutUser = async (req, res) => {
    await User.findByIdAndUpdate(req.user._id, 
        {
            $unset: {
                refreshToken: 1, // this removes the field from document
            },
        },
        { new: true }
    );
    const options = {
        httpOnly: true,
        secure: true
    }
     return res
         .status(200)
         .clearCookie("accessToken", options)
         .clearCookie("refreshToken", options)
         .json(new ApiResponse(200, {}, "User logged Out"));
};

export { registerUser, loginUser, logoutUser};
