# Homebrew Release Steps

This project is distributed through the Homebrew tap at:

```sh
https://github.com/memohnsen/homebrew-tap
```

Users install it with:

```sh
brew tap memohnsen/tap
brew install meetcal
```

## 1. Prepare The Main Repo

Update the version in `package.json` and `bunli.config.ts`.

Run checks:

```sh
bunx tsc --noEmit
bun test
```

`bun test` currently exits with "No tests found" until test files are added.

## 2. Build Release Artifacts

Build all Bunli targets:

```sh
bun run build
```

If Bunli reports missing optional runtime packages, install them:

```sh
bun install --os '*' --cpu '*'
```

Expected output files:

```sh
dist/darwin-arm64.tar.gz
dist/darwin-x64.tar.gz
dist/linux-arm64.tar.gz
dist/linux-x64.tar.gz
dist/windows-x64.tar.gz
```

Generate checksums:

```sh
shasum -a 256 dist/*.tar.gz
```

Smoke test the local macOS ARM build:

```sh
tar -xzf dist/darwin-arm64.tar.gz -C /tmp
/tmp/darwin-arm64/index help
```

## 3. Commit, Tag, And Push

Commit the main repo changes:

```sh
git add .
git commit -m "Release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

## 4. Create The GitHub Release

Upload all platform archives:

```sh
gh release create vX.Y.Z \
  dist/darwin-arm64.tar.gz \
  dist/darwin-x64.tar.gz \
  dist/linux-arm64.tar.gz \
  dist/linux-x64.tar.gz \
  dist/windows-x64.tar.gz \
  --repo memohnsen/meetcal-cli \
  --title "meetcal vX.Y.Z" \
  --notes "Release vX.Y.Z"
```

Verify:

```sh
gh release view vX.Y.Z --repo memohnsen/meetcal-cli
```

## 5. Update The Homebrew Tap

Clone or open the tap repo:

```sh
git clone https://github.com/memohnsen/homebrew-tap.git /tmp/homebrew-tap
cd /tmp/homebrew-tap
```

Edit `Formula/meetcal.rb`:

- Set `version "X.Y.Z"`.
- Update every release URL from `vOLD` to `vX.Y.Z`.
- Replace each `sha256` with the new checksum from `shasum -a 256 dist/*.tar.gz`.

Validate Ruby syntax:

```sh
ruby -c Formula/meetcal.rb
```

Commit and push:

```sh
git add Formula/meetcal.rb
git commit -m "Update meetcal to vX.Y.Z"
git push origin main
```

## 6. Verify Homebrew Install

Refresh the local tap:

```sh
brew update
```

Install or upgrade:

```sh
brew install meetcal
# or
brew upgrade meetcal
```

Run the installed CLI:

```sh
meetcal help
```

If testing from a dirty local Homebrew state, remove and reinstall:

```sh
brew uninstall meetcal
brew install meetcal
```
