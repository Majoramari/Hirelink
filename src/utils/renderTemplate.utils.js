/**
 * Template rendering utility.
 *
 * Loads Embedded JavaScript (EJS) templates from the `templates/` directory and renders them with the
 * provided data.
 *
 * Notes:
 * - Template paths are relative to the `templates/` folder.
 * - Keep templates free of untrusted HTML where possible to reduce injection risk.
 *
 * References:
 * - EJS: https://ejs.co/
 */

import fs from "node:fs/promises";
import path from "node:path";
import ejs from "ejs";

/**
 * Renders an EJS template file.
 * @param {string} templateRelativePath
 * @param {Record<string, unknown>} [data]
 */
export async function renderTemplate(templateRelativePath, data = {}) {
	const filePath = path.join(process.cwd(), "templates", templateRelativePath);
	const src = await fs.readFile(filePath, "utf8");
	return ejs.render(src, data);
}
