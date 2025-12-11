import { talentService } from "../services/index.js";
import { fail, success } from "../utils/response.utils.js";

export async function updateProfile(req, res) {
	const result = await talentService.updateProfile(req.user.id, req.body);
	if (!result.ok) {
		return fail({
			res,
			statusCode: result.statusCode,
			message: result.message,
			details: result.payload,
		});
	}

	return success({
		res,
		statusCode: result.statusCode,
		message: result.message,
		data: result.payload,
	});
}
