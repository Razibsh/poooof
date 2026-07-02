# Runbook — repeatable procedures
<!-- poooof X.Y.Z -->

> Step-by-step procedures for operational work done more than once (deploy an app, provision a
> server, restore a backup, rotate a key). The rule: **the first time a session figures out a
> procedure, it gets written here before the session ends** — the second time should never be
> figured out from scratch. One-off state goes to `STATUS.md`; choices and their reasons go to
> `DECISIONS.md`; this file holds only *how-to*s.
>
> Keep each procedure honest: if a step changed, fix it here in the same commit as the change.
> Stale runbooks are worse than none.

## <Procedure name>

**When to use:** <the situation that calls for this procedure>  
**Last validated:** YYYY-MM-DD

1. <step>
2. <step>
3. …

**Verify:** <how you observe it worked — a URL responding, a service healthy, a restore readable>
