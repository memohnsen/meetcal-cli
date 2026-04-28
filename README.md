# MeetCal CLI

A Bun-based command line tool for querying MeetCal lifting data from Convex.

## Requirements

- [Bun](https://bun.sh/) for local development
- [Homebrew](https://brew.sh/) for installing the released CLI on macOS or Linux

## Install

Install the released CLI with Homebrew:

```sh
brew tap memohnsen/tap
brew install meetcal
```

Install dependencies for local development:

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

### `adaptive`

Search adaptive American records by gender.

```sh
meetcal adaptive --gender Men
meetcal adaptive Women
```

Options:

- `--gender`, `-g`: Gender to search for.

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

### `meet`

Search meet entries by meet name, session number, and platform.

```sh
meetcal meet --name "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness" --sessionNumber 1 --sessionPlatform Red
meetcal meet "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness" 1 Red
```

Options:

- `--name`, `-n`: Meet name to search for.
- `--sessionNumber`, `-s`: Session number to search for.
- `--sessionPlatform`, `-p`: Session platform to search for.

### `meetResults`

Search full results and event make-rate stats for a meet.

```sh
meetcal meetResults --name "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness"
meetcal meetResults "2026 Virus Weightlifting Series 2, Powered by Rogue Fitness"
```

Options:

- `--name`, `-n`: Meet name to search for.

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

### `clubResults`

Analyze club performance stats for a meet, including averages, make rates, PRs, and medals.

```sh
meetcal clubResults --club "POWER AND GRACE PERFORMANCE." --meet "2025 UMWF World Championships"
meetcal clubResults "POWER AND GRACE PERFORMANCE." "2025 UMWF World Championships"
```

Options:

- `--club`, `-c`: Club name.
- `--meet`, `-m`: Meet name.

### `wso`

Get meet results and summary stats for a WSO at a given meet.

```sh
meetcal wso --meet "2026 Masters National Championships & National University Championships" --wso Carolina
meetcal wso "2026 Masters National Championships & National University Championships" Carolina
```

Options:

- `--meet`, `-m`: Meet name.
- `--wso`, `-w`: WSO region.

### `wsoOWLCMS`

Export Carolina WSO records as an OWLCMS CSV.

```sh
meetcal wsoOWLCMS
```

Output:

- Writes `wsoOWLCMS.csv` to `~/Downloads`.

### `usamwResultsScraper`

Export USAMW PDF results as Convex `lifting_results` seed data.

```sh
meetcal usamwResultsScraper --meet "2026 USA Masters Nationals" --date 2026-03-29 --pdf "https://..."
meetcal usamwResultsScraper --meet "2026 USA Masters Nationals" --date 2026-03-29 --pdf "https://..." --pdf "https://..."
meetcal usamwResultsScraper "2026 USA Masters Nationals" 2026-03-29 "https://..."
```

Options:

- `--meet`, `-m`: Meet name.
- `--date`, `-d`: Meet date in `YYYY-MM-DD` format.
- `--adaptive`, `-a`: Mark results as adaptive.
- `--pdf`, `-p`: PDF URL. Repeat this flag for multiple PDFs.

Output:

- Writes `usamwResultsScraper.ts` to `~/Downloads`.

## Build

Build compressed standalone archives for all configured platforms:

```sh
bunli build
```

Expected release artifacts:

```sh
dist/darwin-arm64.tar.gz
dist/darwin-x64.tar.gz
dist/linux-arm64.tar.gz
dist/linux-x64.tar.gz
dist/windows-x64.tar.gz
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
