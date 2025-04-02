import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ message: "Please fill in all fields" });
        }

        const existedUser = await User.findOne({ $or: [{ username }, { email }] });       
        if (existedUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const user = await User.create({
            username: username.toLowerCase(),
            email,
            password,
        });

        const createdUser = await User.findById(user._id).select("-password -refreshToken");
        if (!createdUser) {
            return res.status(500).json({ message: "User registration failed" });
        }

        return res
            .status(201)
            .json(new ApiResponse(200, createdUser, "User registered Successfully"));
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};
export { registerUser };
