/**
 * Development-only HTTP request logging.
 *
 * Wraps Morgan and pipes output into the application logger.
 *
 * Notes:
 * - This middleware is enabled only in non-production environments.
 * - It is designed for local debugging and should not be treated as an audit log.
 *
 * References:
 * - Morgan: https://github.com/expressjs/morgan
 * - Pino: https://getpino.io/
 */

import chalk from "chalk"; // If you chose the simple setup without colored logs, remove this from package.json.
import morgan from "morgan";
import logger from "../lib/logger.js";

const httpLogMiddleware = morgan(
	(tokens, req, res) => {
		const status = Number(tokens.status(req, res));
		let statusColor = chalk.white;
		if (status >= 500) {
			statusColor = chalk.red;
		} else if (status >= 400) {
			statusColor = chalk.yellow;
		} else if (status >= 300) {
			statusColor = chalk.cyan;
		} else if (status >= 200) {
			statusColor = chalk.green;
		}

		return [
			chalk.blue(tokens.method(req, res)),
			tokens.url(req, res),
			statusColor(tokens.status(req, res)),
			chalk.magenta(`${tokens["response-time"](req, res)} ms`),
			chalk.gray(`${tokens.res(req, res, "content-length") || 0} bytes`),
		].join(" ");
	},
	{
		stream: {
			write: (message) => logger.info(message.trim()),
		},
	},
);

export default httpLogMiddleware;
