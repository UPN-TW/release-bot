# release-bot

> A GitHub App built with [Probot](https://github.com/probot/probot) that A Probot app

## GitHub Actions（取代 probot server）

`.github/workflows/release-bot.yml` 是 reusable workflow，行為與 probot 版相同：

- PR merge 進 `dev`：把 PR 記錄附加到 open 的 `bot:release` PR，沒有就開 `Release X.Y.Z`（最新 release +1 patch）
- `bot:release` PR merge 進 `master`：以標題版號建立 draft release

使用方式：把 `examples/caller-release-bot.yml` 複製到目標 repo 的 `.github/workflows/release-bot.yml`（`dev` 與 `master` 都要有），App 要安裝在該 repo，並讓 repo 讀得到 secret `MAMILOVE_RELEASE_BOT_KEY`（App private key）。

緊急停用：variable `RELEASE_BOT_MODE=off`。`shadow` 只讀並比對結果，供改版驗證用。

呼叫端固定 `@v1`。改動先在單一 repo 用 `@<sha>` 驗證，再移動 `v1` tag。

## Setup（舊 probot server）

```sh
# Install dependencies
npm install

# Run with hot reload
npm run build:watch

# Compile and run
npm run build
npm run start
```

## Contributing

If you have suggestions for how release-bot could be improved, or want to report a bug, open an issue! We'd love all and any contributions.

For more, check out the [Contributing Guide](CONTRIBUTING.md).

## License

[ISC](LICENSE) © 2020 guansunyata < >
