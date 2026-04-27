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

Most commands require `CONVEX_URL` to be set.

### `help`

Print the list of available commands and examples.

```sh
meetcal help
```

### `search`

Search for an athlete by name.

```sh
meetcal search --name "First Last"
meetcal search First Last
```

Options:

- `--name`, `-n`: Athlete name to search for.

### `standards`

Search USAW A/B standards for an age group and gender.

```sh
meetcal standards --age Senior --gender Men
meetcal standards U17 Women
```

Options:

- `--age`, `-a`: Age group to search for.
- `--gender`, `-g`: Gender group to search for.

### `qualifyingTotals`

Search qualifying totals for an age group, gender, and event.

```sh
meetcal qualifyingTotals --age Senior --gender Men --event Nationals
meetcal qualifyingTotals --age U17 --gender Women --event "AO Finals"
```

Options:

- `--age`, `-a`: Age group to search for.
- `--gender`, `-g`: Gender group to search for.
- `--event`, `-e`: Event to search for.

### `records`

Search records for an age group, gender, and federation.

```sh
meetcal records --age Senior --gender Men --federation USAW
meetcal records U17 Women IWF
```

Options:

- `--age`, `-a`: Age group to search for.
- `--gender`, `-g`: Gender group to search for.
- `--federation`, `-f`: Record federation. Supported values include `IWF`, `USAW`, `USAMW`, and `UMWF`.

### `wsoRecords`

Search WSO records for an age group, gender, and WSO region.

```sh
meetcal wsoRecords --age Senior --gender Men --wso Carolinas
meetcal wsoRecords U17 Women Carolinas
```

Options:

- `--age`, `-a`: Age group to search for.
- `--gender`, `-g`: Gender group to search for.
- `--wso`, `-w`: WSO region to search for.

### `intlRankings`

Search international rankings for an age group, gender, and meet.

```sh
meetcal intlRankings --age Senior --gender Men --meet Worlds
meetcal intlRankings --age U17 --gender Women --meet "Pan Ams"
```

Options:

- `--age`, `-a`: Age group to search for.
- `--gender`, `-g`: Gender group to search for.
- `--meet`, `-m`: Meet to search for.

### `natRankings`

Search USAW national rankings for a weight class.

```sh
meetcal natRankings --weightClass "Open Men's 110kg"
meetcal natRankings --weightClass "Junior Women's 77kg"
```

Options:

- `--weightClass`, `-a`: Weight class to search for.

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
