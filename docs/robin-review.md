# Advisory Robin reviews

Robin reviews a newly opened same-repository PR automatically, including a draft
PR. It does not automatically rerun on pushes, reopening, or marking a draft ready.
The repository owner can request a fresh review by commenting exactly `/robin`.

Fork and Dependabot PR events do not receive the Actions credentials required for
automatic review. Use the owner-only `/robin` command on those PRs instead. The
manual workflow uses the default branch and the pinned Robin action; it does not
execute the PR's code. Do not switch to `pull_request_target` or expose credentials
to fork workflows to remove this restriction.

Reviews are advisory comments. Robin cannot request changes, dismiss prior review
decisions, or fail CI because of a finding. Its job also tolerates service or quota
failures and is not a required readiness check. A skipped or failed review provides
no review coverage, and Robin does not replace the existing independent reviews.

## Free allowance

The `ROBIN_CLOUDFLARE_API_TOKEN` and `ROBIN_CLOUDFLARE_BASE_URL` Actions secrets
must remain bound to the dedicated `rsearch-robin-pilot` Workers Free account.
That plan
is the spending boundary: requests stop when the shared daily allowance is used.
Do not rebind these secrets to a paid account or enable an upgrade for this
workflow.

Each run permits at most one physical model request, disables SDK retries, rejects
redirects, and uses a diff-only review with 30,000 characters, a 12,000-token
estimated request budget and a 1,500-token output cap. These limits bound each run;
they do not reserve quota or guarantee every PR receives a review. Manual requests
also consume the same daily allowance. When quota runs out, wait for its reset.

The initial pilot succeeded on PR #76 using 167.2 of the 10,000 daily neurons.
That observation is an example, not a fixed cost per PR.
