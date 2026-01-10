/**
 * General utility helpers.
 *
 * Contains small pure functions used across the application:
 * - ID and token generation
 * - environment parsing helpers
 * - duration parsing
 *
 * What is a Pure function?
 * - A function that has no side effect
 * - A function that always return same output when given same input
 *
 * References:
 * - ULID: https://github.com/ulid/spec
 * - Node.js crypto: https://nodejs.org/api/crypto.html
 */

import crypto from "node:crypto";
import { ulid } from "ulid";

/**
 * Generates a ULID string.
 * @returns {string}
 */
export const generateUlid = () => {
	return ulid();
};

/**
 * Generates a random token as hex. (I use it to generate tokens for reset/verify urls)
 * @param {number} [length=32] number of random bytes (hex output is 2x this length)
 * @returns {string}
 */
export const generateToken = (length = 32) => {
	return crypto.randomBytes(length).toString("hex");
};

/**
 * Parses a comma-separated string into a trimmed, non-empty array.
 * @param {unknown} value
 * @returns {string[]}
 */
export const parseIntoArray = (value) => {
	return String(value)
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
};

/**
 * Parses a shorthand duration string into milliseconds.
 *
 * Supports suffixes:
 * - `d` days
 * - `h` hours
 * - `m` minutes
 * - `s` seconds
 *
 * If no suffix is provided, returns the parsed number as-is.
 * @param {string} exp
 * @returns {number}
 */
export const parseExpiry = (exp) => {
	const num = parseInt(exp, 10);
	if (exp.endsWith("d")) {
		return num * 24 * 60 * 60 * 1000;
	}
	if (exp.endsWith("h")) {
		return num * 60 * 60 * 1000;
	}
	if (exp.endsWith("m")) {
		return num * 60 * 1000;
	}
	if (exp.endsWith("s")) {
		return num * 1000;
	}
	return num;
};
