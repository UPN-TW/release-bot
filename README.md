# release-bot

UPN-TW 各 repo 共用的 release 流程，以 GitHub Actions reusable workflow 實作（`.github/workflows/release-bot.yml`）。

## 做什麼

- PR merge 進 `dev`
  - 已有 open 的 `bot:release` PR（dev → master）：在它的 body 附加一行 `#N title | by user`
  - 沒有：開一個 `Release X.Y.Z` PR 並貼上 `bot:release`
    - 版號取已知最大版號 +1 patch，來源包含最新 release、近期 release（含 draft）、近期已 merge 的 release PR 標題
    - 要升 minor / major 時，手動改 release PR 的標題，例如 `Release 8.30.0`
- `bot:release` PR merge 進 `master`
  - 以標題的版號建立 draft release（target `master`）
  - 人工 publish 後才會建 tag，觸發各 repo 的 deploy-production

所有動作都可以重跑：同一個 PR 不會被記兩次，release 已存在就跳過。

## 接入新 repo

1. repo 要有 `dev` 和 `master` 兩個 branch，流程是 dev → master。
2. 把 GitHub App **mamilove-release-bot** 加到這個 repo。需要 org admin：
   Organization settings → GitHub Apps → mamilove-release-bot → Configure → Repository access → 加入 repo
3. 讓 repo 讀得到 org secret `MAMILOVE_RELEASE_BOT_KEY`。需要 org admin：
   Organization settings → Secrets and variables → Actions → `MAMILOVE_RELEASE_BOT_KEY` → Repository access 加入 repo
   或 `gh secret set MAMILOVE_RELEASE_BOT_KEY --org UPN-TW --visibility selected --repos <全部 repo，逗號分隔>`。這個指令會覆寫 secret 的值和整份 repo 清單，必須提供 key 檔，一般用網頁加 repo 即可。
4. 把 [`examples/caller-release-bot.yml`](examples/caller-release-bot.yml) 原樣複製成該 repo 的 `.github/workflows/release-bot.yml`，開 PR 合進 `dev`。
   - `pull_request_target` 執行的是 base branch 上的檔案，所以 `master` 也要有這個檔。它會跟著第一次 release PR 進 `master`。
   - 在那之前，第一次 release merge 不會自動建 draft，要手動建一次：
     `gh release create <版號> --draft --target master --title <版號> --notes "<release PR body>"`
   - 檔案新增 workflow，用 `gh pr merge` 需要 token 有 `workflow` scope，否則直接在網頁上 merge。

`bot:release` label 不必先建，第一次開 release PR 時會自動建立。

## 停用 / 試跑

- 停用單一 repo：Actions → Release Bot → Disable workflow（或 `gh workflow disable "Release Bot" -R UPN-TW/<repo>`）
- caller 可以傳 `with: mode: dry-run`，只在 log 和 job summary 列出要做的事，不寫入；`mode: off` 不執行
- 其他 input（都有預設值）：`app-id`（76919）、`dev-branch`（dev）、`prod-branch`（master）、`release-label`（bot:release）

## 開發

- 測試：`node test/release-bot.test.js`，用 mock GitHub API 執行 workflow 內的 script，不需安裝套件
- lint：`docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest -no-color`
- 各 repo 的 caller 固定用 `@v1`。改版流程：
  1. 改動合進 `master`
  2. 視需要在一個 repo 把 caller 暫時指到 `@<sha>` 驗證
  3. 移動 tag：`git tag -f -a v1 -m ... <sha> && git push -f origin v1`
  4. 回滾：把 `v1` 移回上一個 commit

## 權限與安全

- token：用 App private key 換的短效 installation token，只限呼叫端 repo
  - release PR 的作者是 `mamilove-release-bot[bot]`
  - App token 開的 PR 會觸發其他 workflow；`GITHUB_TOKEN` 開的不會
- 呼叫端用 `pull_request_target`，因為 PR 多來自 fork，`pull_request` 事件拿不到寫入 token 和 secret
  - workflow 不 checkout、不執行 PR 程式碼
  - PR 標題 / 內文只從 `context.payload` 讀取，不用 `${{ }}` 內插進 script

## 歷史

2026-10-22 以前是跑在 GCE VM 上的 probot app（probot 9），2026-10-22 切換到這個 workflow。舊程式碼請看 git 歷史（移除前最後一版是 `9b09f6d`）。

## License

[ISC](LICENSE)
