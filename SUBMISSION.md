# Submission

Please do **not** fork this repository and do **not** open a pull request.
Forks of a public repository are public, so other candidates would see your solution.

Before you submit, make sure `BUGS.md`, `AGENT_PROMPTS.md` and `NOTES.md` are filled in
and that build, type check, lint and tests pass.

## How to submit

1. Commit your work, or leave it uncommitted; both work.
2. Run:

   ```bash
   npm run submit:pack
   ```

   This creates `submission-<date>.zip` with:
   - `changes.diff`: all your changes compared to the first commit (new files included),
   - `BUGS.md`, `AGENT_PROMPTS.md`, `NOTES.md`.

   `node_modules` and build output are not included. The script needs only `git` and Node.js.
3. Send the zip to the email address given in the task document you received from the recruiter.

If you do not have git, send a zip of the project folder without `node_modules`.

Questions: write to the same email address.
