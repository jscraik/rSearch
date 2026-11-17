import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const workflow = parse(
	readFileSync(".github/workflows/robin-pilot.yml", "utf8"),
);

describe("advisory Robin automation", () => {
	it("reviews new PRs without enabling push or privileged target events", () => {
		expect(workflow.on.pull_request.types).toEqual(["opened"]);
		expect(workflow.on.issue_comment.types).toEqual(["created"]);
		expect(Object.keys(workflow.on).sort()).toEqual([
			"issue_comment",
			"pull_request",
		]);
	});

	it.each([
		["pull_request", "jscraik/rSearch", "jscraik", "/robin", true, true],
		["pull_request", "someone/fork", "jscraik", "/robin", true, false],
		["pull_request", "jscraik/rSearch", "dependabot[bot]", "", true, false],
		["issue_comment", "someone/fork", "jscraik", "/robin", true, true],
		["issue_comment", "jscraik/rSearch", "outsider", "/robin", true, false],
		[
			"issue_comment",
			"jscraik/rSearch",
			"jscraik",
			"/robin extra",
			true,
			false,
		],
		["issue_comment", "jscraik/rSearch", "jscraik", "/robin", false, false],
		["workflow_dispatch", "jscraik/rSearch", "jscraik", "/robin", true, false],
	])("admits %s repo=%s actor=%s body=%s PR=%s as %s", (event, repo, actor, body, isPr, expected) => {
		// The production expression uses only operators shared by Actions and JS.
		// Evaluate its complete grouping, including rejected event combinations.
		const expression = workflow.jobs.robin.if.trim().slice(3, -2);
		const result = runInNewContext(
			expression,
			{
				github: {
					event_name: event,
					repository: "jscraik/rSearch",
					actor,
					event: {
						pull_request: { head: { repo: { full_name: repo } } },
						issue: { pull_request: isPr },
						comment: { user: { login: actor }, body },
					},
				},
			},
			{ timeout: 1000 },
		);
		expect(Boolean(result)).toBe(expected);
	});

	it("keeps quota failures and findings advisory with bounded inference", () => {
		const job = workflow.jobs.robin;
		expect(job["continue-on-error"]).toBe(true);
		const review = job.steps.find(
			(step: { name: string }) => step.name === "Advisory diff review",
		).with;
		expect(review["agent-mode"]).toBe("off");
		expect(review["request-changes"]).toBe("false");
		expect(review["fail-on-high"]).toBe("false");
		expect(review["review-on-synchronize"]).toBe("false");
		expect(review["max-output-tokens"]).toBe("1500");
		expect(review["max-diff-size"]).toBe("30000");
		const patch = job.steps.find(
			(step: { name: string }) =>
				step.name === "Preserve existing review decisions",
		).run;
		expect(patch).toContain("globalThis.__rsearchRobinPilotRequestSent = true");
		expect(patch).toContain("maxRetries: 0");
		expect(patch).toContain("redirect: 'error'");
		expect(patch).toContain(
			"Advisory pilot: leave existing reviews unchanged.",
		);
	});
});
