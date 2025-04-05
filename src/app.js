import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Import routes
import userRoutes from "./routes/user.routes.js";

// Use routes
app.use("/api/v1/user", userRoutes);

// Global Error-Handling Middleware
app.use((err, req, res, next) => {
    console.error("Global error handler:", err); // Log the error
    res.status(err.status || 500).json({
        message: err.message || "An unexpected error occurred",
    });
});

export { app };
