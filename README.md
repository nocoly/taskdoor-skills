# TaskDoor skills

Agent skills for TaskDoor: they let an AI agent work with your team's tasks
through the `taskdoor` command-line tool.

## Install

    npx skills add nocoly/taskdoor-skills -g -y

The skill expects the TaskDoor CLI ([`@taskdoor/cli`](https://www.npmjs.com/package/@taskdoor/cli), source at
[nocoly/taskdoor-cli](https://github.com/nocoly/taskdoor-cli)):

    npm install -g @taskdoor/cli
    taskdoor login

## Skills

- [`taskdoor`](skills/taskdoor/SKILL.md): set up the CLI, find commands with `taskdoor --help`, read exit
  codes, and act safely on shared tasks.
