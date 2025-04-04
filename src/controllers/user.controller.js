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
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
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
    const { email, username, password } = req.body;

    // Validate input
    if (!(username || email)) {
        return res.status(400).json({
            statusCode: 400,
            message: "Username or email is required",
        });
    }

    try {
        // Find user by username or email
        const user = await User.findOne({
            $or: [{ username }, { email }],
        });

        if (!user) {
            return res.status(404).json({
                statusCode: 404,
                message: "User does not exist",
            });
        }

        // Validate password
        const isPasswordValid = await user.isPasswordCorrect(password);
        if (!isPasswordValid) {
            return res.status(401).json({
                statusCode: 401,
                message: "Invalid user credentials",
            });
        }

        // Generate access and refresh tokens
        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user._id);

        // Fetch user details excluding sensitive fields
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

        // Set cookies for tokens
        const options = {
            httpOnly: true,
            secure: true,
        };

        // Return success response
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        user: loggedInUser,
                        accessToken,
                        refreshToken,
                    },
                    "User logged In Successfully"
                )
            );
    } catch (error) {
        // Handle unexpected errors
        console.error("Error in loginUser:", error);
        return res.status(500).json({
            statusCode: 500,
            message: "An unexpected error occurred",
        });
    }
};
const logoutUser = async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1, // this removes the field from document
            },
        },
        { new: true }
    );
    const options = {
        httpOnly: true,
        secure: true,
    };
    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"));
};

const refreshAccessToken = async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request");
    }
    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findById(decodedToken._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }
        const options = {
            httpOnly: true,
            secure: true,
        };

        const { accessToken, newRefreshToken } = await generateAccessAndRefereshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
};

const changeCurrentPassword = async (req, res) => {
    try {
        console.log("Request body:", req.body);
        console.log("Request user ID:", req._id);

        if (!req._id) {
            throw new ApiError(400, "User ID is missing");
        }

        const user = await User.findById(req._id);
        console.log("User found:", user);

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const { oldPassword, newPassword } = req.body;
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
        console.log("Is old password correct:", isPasswordCorrect);

        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid old password");
        }

        user.password = newPassword;
        await user.save({ validateBeforeSave: false });

        return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
    } catch (error) {
        console.error("Error in changeCurrentPassword:", error);
        return res.status(500).json({ message: error.message });
    }
};

const getCurrentUser = async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
};

const updateAccountDetails = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                email,
            },
        },
        { new: true }
    );

    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"));
};

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
};
