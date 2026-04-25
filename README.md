# MeetCal CLI

A Bun-based command line tool for querying MeetCal lifting data from Convex.

## Requirements

- [Bun](https://bun.sh/)
- Access to the MeetCal Convex deployment URL

Create a local environment file before running commands:

```sh
CONVEX_URL=https://your-convex-deployment.convex.cloud
```

Save that value in `.env.local`, or export it in your shell:

```sh
export CONVEX_URL=https://your-convex-deployment.convex.cloud
```

`.env.local` is ignored by git and should not be committed.

## Install

```sh
bun install
```

The install step also runs `bunli generate`, which refreshes generated Bunli command files.

## Run The CLI

During development, run the CLI directly from TypeScript:

```sh
bunli dev search --name "Maddisen Mohnsen"
```

You can also pass the athlete name as positional arguments:

```sh
bunli dev search Maddisen Mohnsen
```

The `search` command prints the athlete's competition PRs and meet results in tables.

## Commands

### `search`

Search for an athlete by name.

```sh
meetcal-cli search --name "First Last"
meetcal-cli search First Last
```

Options:

- `--name`, `-n`: Athlete name to search for.

Environment:

- `CONVEX_URL`: Required. Convex deployment URL used by `ConvexHttpClient`.

## Build

Build the CLI into `dist/`:

```sh
bunli build
```

After building, the package binary points to:

```sh
./dist/index.js
```

## Developer Workflow

Common checks:

```sh
bun run typecheck
bun test
```

Project layout:

- `src/index.ts`: CLI entry point. Registers commands with Bunli.
- `src/commands/`: Command implementations.
- `src/types/`: Shared TypeScript types.
- `bunli.config.ts`: Bunli command, build, dev, and test configuration.

To add or edit a command:

1. Add or update a file in `src/commands/`.
2. Export a `defineCommand(...)` command from that file.
3. Import and register the command in `src/index.ts` with `cli.command(...)`.
4. Run `bun run typecheck`.
5. Run the command locally with `bunli dev -- <command>`.
