/**
 * Global Express middleware setup.
 *
 * Responsibilities:
 * - security middleware (helmet, HTTP Parameter Pollution (HPP) protection)
 * - Cross-Origin Resource Sharing (CORS) configuration
 * - rate limiting
 * - compression, body parsing, and cookies
 * - request timeout
 * - development-only request logging
 *
 * References:
 * - Express security best practices: https://expressjs.com/en/advanced/best-practice-security.html
 * - Helmet: https://helmetjs.github.io/
 * - CORS: https://github.com/expressjs/cors
 * - connect-timeout: https://github.com/expressjs/timeout
 * - HTTP Parameter Pollution: https://www.npmjs.com/package/hpp
 */

import compression from "compression";
import timeout from "connect-timeout";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import hpp from "hpp";
import env from "../config/env.js";
import logger from "../lib/logger.js";
import { fail } from "../utils/response.utils.js";
import httpLogMiddleware from "./httpLog.js";

const isProd = env.NODE_ENV === "production";

function haltOnTimedout(req, _res, next) {
	if (req.timedout) {
		return;
	}
	return next();
}

function bindTimeoutHandler(req, res, next) {
	req.on("timeout", () => {
		if (res.headersSent) {
			return;
		}
		fail({
			res,
			statusCode: 503,
			message: "request timeout",
			details: null,
		});
	});
	return next();
}

function enforceAllowedOrigin(req, res, next) {
	const origin = req.headers.origin;
	if (!origin) {
		return next();
	}

	if (env.ALLOWED_ORIGINS.includes(origin)) {
		return next();
	}

	if (!isProd) {
		return next();
	}

	return fail({
		res,
		statusCode: 403,
		message: "forbidden origin",
		details: null,
	});
}

/**
 * Applies global, cross-cutting middleware to the Express application.
 * @param {import("express").Express} app
 */
export default function applyGlobalMiddleware(app) {
	// Trust the reverse proxy if the application is behind Apache or Nginx
	app.set("trust proxy", env.TRUST_PROXY ? 1 : false);
	app.disable("x-powered-by");

	// --- Development-only logging ---
	if (!isProd) {
		app.use(httpLogMiddleware);
	}

	// --- Security ---
	// Read more about helmet: https://expressjs.com/en/advanced/best-practice-security.html#use-helmet
	app.use(
		helmet({
			contentSecurityPolicy: isProd ? undefined : false,
			hsts: isProd ? undefined : false,
		}),
	);

	// Prevent HTTP parameter pollution
	app.use(
		hpp({
			whitelist: ["filter"],
		}),
	);

	// --- CORS ---
	app.use(
		cors({
			credentials: true,
			origin: (origin, callback) => {
				// Allow requests with no origin (for example, Postman or same-origin requests).
				if (!origin) {
					return callback(null, true);
				}

				// Check whether the origin is in the list of allowed origins.
				if (env.ALLOWED_ORIGINS.includes(origin)) {
					return callback(null, true);
				}

				// In production, block all other origins.
				// Prefer returning false (avoid turning CORS rejections into 5xx errors).
				if (env.NODE_ENV === "production") {
					return callback(null, false);
				}

				// In development, allow unknown origins for convenience.
				return callback(null, true);
			},
			optionsSuccessStatus: 200,
		}),
	);
	app.use(enforceAllowedOrigin);

	// --- Rate limiting ---
	// Limit requests to 100 per 15 minutes.
	app.use(
		rateLimit({
			windowMs: 15 * 60_000,
			max: 100,
			standardHeaders: true,
			legacyHeaders: false,
			handler: (_req, res) =>
				fail({
					res,
					statusCode: 429,
					message: "too many requests",
					details: null,
				}),
		}),
	);

	// --- Parsing ---
	app.use(compression());
	app.use(express.json({ limit: "10mb" }));
	app.use(express.urlencoded({ extended: true, limit: "10mb" }));
	app.use(cookieParser());

	// --- Request timeout ---
	const reqTimeout = 30_000; // 30 seconds
	app.use(timeout(`${reqTimeout}ms`, { respond: false }));
	app.use(bindTimeoutHandler);
	app.use(haltOnTimedout);

	logger.debug("Global middleware applied successfully");
}
