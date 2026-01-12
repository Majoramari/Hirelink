/**
 * Jobs controller unit tests.
 *
 * Strategy:
 * - Mock the service layer (`src/services/index.js`) and verify controller behavior.
 * - Ensure controllers map service results into the standard API response shape.
 *
 * References:
 * - Vitest mocking: https://vitest.dev/guide/mocking
 * - Express Response API: https://expressjs.com/en/api.html#res
 */

import { describe, expect, it, vi } from "vitest";
import { createMockRes } from "./test.utils.js";

vi.mock("../../src/services/index.js", () => {
	return {
		jobService: {
			listTalentJobs: vi.fn(async () => ({
				ok: true,
				statusCode: 200,
				message: "jobs fetched",
				payload: [{ id: "job1" }],
			})),
			getPublicJob: vi.fn(async (id) => ({
				ok: true,
				statusCode: 200,
				message: "job fetched",
				payload: { id },
			})),
			createEmployerJob: vi.fn(async () => ({
				ok: true,
				statusCode: 201,
				message: "job created",
				payload: { id: "job2" },
			})),
			listEmployerJobs: vi.fn(async () => ({
				ok: true,
				statusCode: 200,
				message: "jobs fetched",
				payload: [],
			})),
			getEmployerJob: vi.fn(async () => ({
				ok: true,
				statusCode: 200,
				message: "job fetched",
				payload: { id: "job" },
			})),
			updateEmployerJob: vi.fn(async () => ({
				ok: true,
				statusCode: 200,
				message: "job updated",
				payload: { id: "job" },
			})),
			deleteEmployerJob: vi.fn(async () => ({
				ok: true,
				statusCode: 200,
				message: "job deleted",
				payload: null,
			})),
		},
		applicationService: {
			applyToJob: vi.fn(async () => ({
				ok: true,
				statusCode: 201,
				message: "application created",
				payload: { id: "app1" },
			})),
		},
	};
});

import * as jobsController from "../../src/controllers/jobs.controller.js";

describe("jobs.controller", () => {
	it("list returns payload", async () => {
		const req = { user: { id: "u1" }, query: {} };
		const res = createMockRes();

		await jobsController.list(req, res);

		expect(res.statusCode).toBe(200);
		expect(res.body.success).toBe(true);
		expect(res.body.data).toEqual([{ id: "job1" }]);
	});

	it("apply returns created application", async () => {
		const req = { user: { id: "u1" }, params: { jobId: "job1" }, body: {} };
		const res = createMockRes();

		await jobsController.apply(req, res);

		expect(res.statusCode).toBe(201);
		expect(res.body.data).toEqual({ id: "app1" });
	});
});
