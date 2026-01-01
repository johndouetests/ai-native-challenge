# AI-Native Engineer Challenge: Backend

Time: about 1 hour. AI assistants are allowed and expected.

You are not expected to find everything. Start with the defects that hurt users most:
lost or wrong data and broken flows come before cosmetic issues. In `BUGS.md`, list what
you chose to skip and why.

## Scenario

An AI agent generated this project from `SPEC.md`. It builds, the visible tests pass,
and at first sight it looks fine. It is not correct. Your job is to act like the engineer
who is responsible for what the agent produced.

## This is not a QA task

A tester checks the service from the outside: send a request, compare the response with the
spec. Here you own the code. Many defects an agent leaves behind are not visible in a single
response. To find them you read the code against the spec and ask questions like:

- What if this request arrives twice, or at the same moment as another one?
- What if one step succeeds and the next one fails?
- Who is allowed to do this, and where exactly is that checked?
- What ends up in the database, the logs and open connections, not only in the response?
- Does this still hold on a different day, time zone or server?
- Do the existing tests check what the spec says, or only what the code happens to do?

For each defect we want what only an engineer can give: the **root cause in the code**,
a **failing test** that proves it, and a **minimal change** that removes it.
Then you check that your agent's change really does that, and did not just hide the symptom.

This is the daily work of the position. Most code will be written by agents. A backend
engineer here is the person who reviews it, catches what the agent missed, and is
responsible for the data and money that pass through it.

## What to do

1. Read `SPEC.md` and `openapi.yaml`. Run the project (see `README.md`).
2. Find the places where the service does not match the spec.
   The defects are of different kinds and different difficulty. We do not tell you how many.
   Decide what matters most and work on that first.
3. Before you change the code for a defect, add a failing test for it in `tests/candidate/`.
   Then make the test pass.
4. Correct the defects in the code. Use your AI assistant however you like. Change code by hand
   where that is faster, or where the agent keeps getting it wrong.
5. Describe what you found in `BUGS.md`.
6. For 2-3 defects of your choice, write in `AGENT_PROMPTS.md` the prompt you gave your agent
   and what happened.
7. Write 5-10 lines in `NOTES.md`: how you checked the agent's work.

## Rules

- Do not change `SPEC.md`, `openapi.yaml` or the existing tests. Put new tests in `tests/candidate/`.
- Do not turn off lint or type checks.
- Do not fork this repository and do not open pull requests. See `SUBMISSION.md`.
- Do not publish the task or your solution anywhere.
- You are responsible for every line you submit. Be ready to explain any change.

## How we evaluate

We look at which defects you found and corrected, how clearly you describe and reproduce
them, the tests you wrote, how well you instruct your AI agent, and how you check the results.
A few well-checked changes to important defects are better than many small cosmetic ones,
and much better than a large unchecked rewrite.
