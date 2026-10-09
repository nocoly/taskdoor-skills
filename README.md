# TaskDoor skills

Agent skills for TaskDoor. Each skill is an independent directory under `skills/`,
with its own `SKILL.md` and the references it needs.

## Install

    npx skills add nocoly/taskdoor-skills -g -y

The `taskdoor` CLI skill expects the TaskDoor CLI ([`@taskdoor/cli`](https://www.npmjs.com/package/@taskdoor/cli), source at
[nocoly/taskdoor-cli](https://github.com/nocoly/taskdoor-cli)):

    npm install -g @taskdoor/cli
    taskdoor login

For a private or sandbox deployment, add `--server <origin>` to `taskdoor login`.

## Skills

- [`taskdoor`](skills/taskdoor/SKILL.md): set up the CLI, find commands with `taskdoor --help`, read exit
  codes, and act safely on shared tasks.
- [`taskdoor-create-task`](skills/taskdoor-create-task/SKILL.md): turn a user's request into an editable,
  nested task proposal for production frontends. Generate task goals, completion criteria, owners and
  participants from confirmed responsibilities, due dates, execution tips, effort estimates and dependencies.
  The application supplies the current member directory and relevant context; no CLI or MCP write access
  is required to generate the proposal.

The creation skill returns JSON conforming to `taskdoor.task-preview.v1`. Users preview and edit the
proposal first. After explicit confirmation, the application's execution service validates the final
edited version and creates tasks through MCP. The skill itself never creates tasks, grants permission,
returns creation receipts or treats `ready` as confirmation.

It contains no credentials, fixed workspace or team, evaluation fixtures, or historical design protocols.
Its complete planning guidance and JSON Schema are included in the independently installable directory.

## Task proposal integration

Load `taskdoor-create-task` and supply the request context separately: `requestId`, `userRequest`,
`currentDate`, `timezone`, `currentMemberId`, and `members: [{id, name, responsibilities}]`.
`responsibilities` is an array of confirmed responsibility strings. Use the current workspace's member
IDs, not account IDs or names; the application fetches and validates this directory before generation.
For edits, also supply `previousPlan` containing the frontend's current edited proposal.

Render the returned `tasks` and nested `children` for preview, resolving `ownerMemberId` and
`participants[].memberId` against the same member directory. After confirmation, the execution service
maps the final proposal to MCP tool arguments and replaces temporary `clientId` references with real
task IDs. The preview JSON is not directly a MCP creation request. See the
[input and output contract](skills/taskdoor-create-task/references/task-preview.md) and
[JSON Schema](skills/taskdoor-create-task/references/task-preview.schema.json).

## Adding skills

Add `skills/<skill-name>/SKILL.md` and only the supporting files needed for that skill. Keep references
inside its directory so it can be installed on its own. Add the skill to the list above; no router or
shared runtime registry is required. Do not place evaluation reports or historical design protocols in
the installable directory.

Run the dependency-free packaging check before publishing:

    node scripts/check-skills.mjs
