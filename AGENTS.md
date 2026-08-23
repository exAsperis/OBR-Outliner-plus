# Repository agent notes

## Production build recovery

- When a commit pushed as part of the current task causes the production build or deployment workflow to fail, diagnose the failure and make the smallest safe corrective change.
- After proportionate local verification, Codex has standing authorization to commit and push that corrective change to the same branch without requesting additional approval.
- Keep recovery commits narrowly scoped to restoring the failed build or deployment. Report the cause, correction, verification, commit, and resulting workflow status.
- This standing authorization does not extend to unrelated changes, force-pushes, history rewrites, secret or permission changes, destructive operations, or publishing to a different branch or remote.
