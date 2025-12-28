/**
 * Creates and configures the Express application:
 * - applies global middleware
 * - mounts API routes
 * - installs 404 and error-handling middleware
 *
 * Middleware order matters:
 * - global middleware first (security, parsing, cors)
 * - routes next
 * - 404 handler after routes
 * - error handler last (Express only forwards to error middleware if it has 4 args)
 *
 * References:
 * - Express error handling: https://expressjs.com/en/guide/error-handling.html
 * - Express security best practices: https://expressjs.com/en/advanced/best-practice-security.html
 */

import express from "express";
import env from "./config/env.js";
import applyGlobalMiddleware from "./middleware/applyGlobals.js";
import errorHandler from "./middleware/errorHandler.js";
import NotFoundMiddleware from "./middleware/notFound.js";
import routes from "./routes/index.js";

const app = express();

// Apply middleware
applyGlobalMiddleware(app);

// Setup routes
app.use(`/api/${env.API_VERSION}`, routes);

// 404 not found
app.use(NotFoundMiddleware);

// Error handler
app.use(errorHandler);

export default app;
