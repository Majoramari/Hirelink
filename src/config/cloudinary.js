/**
 * Cloudinary configuration.
 *
 * Initializes Cloudinary and exposes Multer CloudinaryStorage instances used by
 * the upload middleware for avatars/logos and resumes.
 *
 * Notes:
 * - Images use Cloudinary's default image handling (resource_type defaults to image).
 * - Resumes are uploaded as `raw` files and forced to `pdf` format.
 * - Storage settings are kept here so middleware/routes do not need Cloudinary details.
 *
 * References:
 * - Cloudinary Node SDK: https://cloudinary.com/documentation/node_integration
 * - multer-storage-cloudinary: https://github.com/affanshahid/multer-storage-cloudinary
 * - Multer: https://github.com/expressjs/multer
 * - Enable PDF and ZIP file delivery: https://support.cloudinary.com/hc/en-us/articles/20970529312146-How-to-Upload-Manage-and-Deliver-PDF-Files
 */

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import env from "./env.js";

cloudinary.config({
	cloud_name: env.CLOUDINARY_CLOUD_NAME,
	api_key: env.CLOUDINARY_API_KEY,
	api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * CloudinaryStorage for image uploads (avatars/logos).
 */
const avatarStorage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: "avatars",
		allowed_formats: ["jpg", "jpeg", "png", "webp"],
	},
});

/**
 * CloudinaryStorage for raw uploads (PDF resumes).
 */
const resumeStorage = new CloudinaryStorage({
	cloudinary,
	params: {
		folder: "resumes",
		resource_type: "raw",
		format: "pdf",
	},
});

export { cloudinary, avatarStorage, resumeStorage };
