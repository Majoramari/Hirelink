/**
 * Creates and configures the Express application:
 * - applies global middleware
 * - mounts API routes
 * - adds 404 and error-handling middleware
 *
 * Middleware order is important:
 * - global middleware first (security, parsing, cors)
 * - routes next
 * - 404 handler after routes
 * - error handler last (Express forwards errors only to middleware with 4 arguments)
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

// Apply global middleware
applyGlobalMiddleware(app);

// Set up routes
app.use(`/api/${env.API_VERSION}`, routes);

// Handle 404 (not found)
app.use(NotFoundMiddleware);

// Handle errors
app.use(errorHandler);

export default app;
