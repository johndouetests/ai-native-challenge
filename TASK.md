# AI-Native Engineer Challenge: Frontend

Time: about 1 hour. AI assistants are allowed and expected.

You are not expected to find everything. Start with the defects that hurt users most:
lost or wrong data and broken flows come before cosmetic issues. In `BUGS.md`, list what
you chose to skip and why.

## Scenario

An AI agent generated this project from `SPEC.md`. It builds, the visible tests pass,
and at first sight it looks fine. It is not correct. Your job is to act like the engineer
who is responsible for what the agent produced.

## This is not a QA task

A tester checks the app from the outside: click through it, compare it with the design.
Here you own the code. Many defects an agent leaves behind do not show up in a normal
click-through. To find them you read the code against the spec and ask questions like:

- What if things happen in a different order, or at a different speed, than in my demo?
- What is still running or still applied after the user has moved on?
- What does the user see and keep when something goes wrong?
- Does this still work with much more data, or with unusual data?
- Does it work for users who are not like me?
- Do the existing tests check what the spec says, or only what the code happens to do?

For each defect we want what only an engineer can give: the **root cause in the code**,
a **minimal change** that removes it, and proof that the change works.
Then you check that your agent's change really does that, and did not just hide the symptom.

This is the daily work of the position. Most code will be written by agents. A frontend
engineer here is the person who reviews it, catches what the agent missed, and is
responsible for what goes to users.

## What to do

1. Read `SPEC.md`, `openapi.yaml` and `SIMULATOR.md`. Look at the screenshots in `design/`.
   Run the project (see `README.md`).
2. Find the places where the app does not match the spec or the design.
   The defects are of different kinds and different difficulty. We do not tell you how many.
   Decide what matters most and work on that first.
3. Correct them in the code. Use your AI assistant however you like. Change code by hand
   where that is faster, or where the agent keeps getting it wrong.
4. Describe what you found in `BUGS.md`.
5. For 2-3 defects of your choice, write in `AGENT_PROMPTS.md` the prompt you gave your agent
   and what happened.
6. Write 5-10 lines in `NOTES.md`: how you checked the agent's work.

## Rules

- Do not change `SPEC.md`, `openapi.yaml`, `SIMULATOR.md`, `design/`, the simulator (`server/`)
  or the existing tests. You may add new tests.
- Do not turn off lint or type checks.
- Do not fork this repository and do not open pull requests. See `SUBMISSION.md`.
- Do not publish the task or your solution anywhere.
- You are responsible for every line you submit. Be ready to explain any change.
- Differences smaller than 1px caused by font rendering on your OS do not count.

## How we evaluate

We look at which defects you found and corrected, how clearly you describe and reproduce
them, how well you instruct your AI agent, and how you check the results.
A few well-checked changes to important defects are better than many small cosmetic ones,
and much better than a large unchecked rewrite.
