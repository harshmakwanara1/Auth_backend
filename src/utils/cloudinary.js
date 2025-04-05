import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        // Upload file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
        console.log("File uploaded to Cloudinary:", response.url);

        // Delete the file from local storage
        try {
            fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
            console.error("Error deleting local file:", unlinkError.message);
        }

        // Return the Cloudinary response
        return response;
    } catch (error) {
        console.error("Error uploading to Cloudinary:", error.message);

        // Attempt to delete the file even if upload fails
        try {
            fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
            console.error("Error deleting local file after failed upload:", unlinkError.message);
        }

        // Throw the error to be handled by the caller
        throw new Error("Failed to upload file to Cloudinary");
    }
};
