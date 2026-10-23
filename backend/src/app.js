import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { notFound, errorHandler } from "./middleware/error.middleware.js";
import routes from "./routes/index.js";
import { corsOptions } from "./config/cors.js";
import { auditTrail } from "./middleware/audit.middleware.js";

const app = express();

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (env.nodeEnv === "development") app.use(morgan("dev"));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ success: true, message: `${env.university} API is running` });
});

// All module routes live in routes/index.js
app.use("/api", auditTrail, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
