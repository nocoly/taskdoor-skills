# Taskdoor skills

Agent skills for Taskdoor. Each skill is an independent directory under `skills/`,
with its own `SKILL.md` and the references it needs.

## Install

    npx skills add nocoly/taskdoor-skills -g -y

The `taskdoor` CLI skill expects the Taskdoor CLI ([`@taskdoor/cli`](https://www.npmjs.com/package/@taskdoor/cli), source at
[nocoly/taskdoor-cli](https://github.com/nocoly/taskdoor-cli)):

    npm install -g @taskdoor/cli
    taskdoor login

For a private or sandbox deployment, add `--server <origin>` to `taskdoor login`.

## Skills

- [`taskdoor`](skills/taskdoor/SKILL.md): set up the CLI, find commands with `taskdoor --help`, read exit
  codes, and act safely on shared tasks.
- [`taskdoor-mcp`](skills/taskdoor-mcp/SKILL.md): configure remote Taskdoor MCP in an AI client, signing
  in through the browser where the client supports MCP authorization or with a personal access token
  otherwise, preserve existing servers, and verify the connection without requiring the CLI.
- [`taskdoor-create-task`](skills/taskdoor-create-task/SKILL.md): turn a user's request into tasks and
  subtasks, assign owners from confirmed team responsibilities, and create and verify them through an
  already connected Taskdoor MCP. Requires that MCP connection; does not require the CLI.
- [`taskdoor-discussion-subtask`](skills/taskdoor-discussion-subtask/SKILL.md): prepare one direct subtask
  from a selected discussion or from a request submitted in the subtask list. The application provides
  the parent task context and handles confirmation and saving.

The creation skill includes task goals, completion criteria, due dates, execution tips and effort
estimates. It asks at most three multiple-choice questions when a key detail is missing, points out
existing tasks that look like duplicates or could be the parent, and writes user-facing text in the
requested language (Chinese or English). It preserves explicit user choices and reports partial
failures with the real task IDs.
It contains no credentials, fixed workspace or team, offline proposal protocol, or evaluation fixtures.

## Adding skills

Add `skills/<skill-name>/SKILL.md` and only the supporting files needed for that skill. Keep references
inside its directory so it can be installed on its own. Add the skill to the list above; no router or
shared runtime registry is required. Do not place evaluation reports or historical design protocols in
the installable directory.

Run the dependency-free packaging check before publishing:

    node scripts/check-skills.mjs
