// 用 in-memory GitHub mock 執行 .github/workflows/release-bot.yml 裡的 github-script。
// 執行：node test/release-bot.test.js（不需安裝套件）
const fs = require('fs');
const path = process.argv[2] || require('path').join(__dirname, '..', '.github', 'workflows', 'release-bot.yml');
const lines = fs.readFileSync(path, 'utf8').split('\n');
const start = lines.findIndex((l) => l.trim() === 'script: |') + 1;
const body = lines.slice(start).map((l) => l.replace(/^ {12}/, '')).join('\n');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const fn = new AsyncFunction('github', 'context', 'core', 'process', body);

const httpErr = (status, message) => Object.assign(new Error(message), { status, response: { data: { message, errors: [{ message }] } } });

function makeWorld(init) {
  const w = { pulls: [], releases: [], calls: [], nextNum: 1000, failCreate: null, clobberOnce: false, ...init };
  const listPulls = async (p) => ({ data: w.pulls.filter((x) => x.state === p.state && (!p.base || x.base.ref === p.base) && (!p.head || `o:${x.head.ref}` === p.head)) });
  const github = {
    paginate: async (f, p) => (await f(p)).data,
    rest: {
      pulls: {
        list: listPulls,
        get: async ({ pull_number }) => ({ data: { ...w.pulls.find((x) => x.number === pull_number) } }),
        update: async ({ pull_number, body }) => {
          w.calls.push(['pulls.update', pull_number]);
          const p = w.pulls.find((x) => x.number === pull_number);
          if (w.clobberOnce) { w.clobberOnce = false; p.body = body.split('\n').slice(0, -1).join('\n'); return; } // simulate lost update
          p.body = body;
        },
        create: async ({ title, body, base, head }) => {
          w.calls.push(['pulls.create', title]);
          if (w.failCreate) throw w.failCreate;
          const p = { number: w.nextNum++, title, body, base: { ref: base }, head: { ref: head, user: { login: 'o' } }, user: { login: 'bot' }, labels: [], state: 'open' };
          w.pulls.push(p);
          return { data: p };
        },
      },
      issues: { addLabels: async ({ issue_number, labels }) => { w.calls.push(['addLabels', issue_number]); w.pulls.find((x) => x.number === issue_number).labels.push(...labels.map((name) => ({ name }))); } },
      repos: {
        getLatestRelease: async () => { if (w.latestErr) throw w.latestErr; const r = w.releases.filter((x) => !x.draft)[0]; if (!r) throw httpErr(404, 'Not Found'); return { data: r }; },
        listReleases: async () => ({ data: w.releases }),
        createRelease: async (p) => { w.calls.push(['createRelease', p.tag_name, p.draft, p.target_commitish]); w.releases.unshift({ ...p, author: { login: 'bot' } }); },
      },
    },
  };
  return { w, github };
}

const summary = { addHeading() { return this; }, addRaw() { return this; }, addList() { return this; }, async write() {} };
async function run(name, mode, pr, init, check) {
  const { w, github } = makeWorld(init);
  const out = { warnings: [], failed: null, notices: [] };
  const core = { info() {}, warning: (m) => out.warnings.push(m), notice: (m) => out.notices.push(m), setFailed: (m) => (out.failed = m), summary };
  const env = { MODE: mode, DEV_BRANCH: 'dev', PROD_BRANCH: 'master', RELEASE_LABEL: 'bot:release' };
  const proc = { env };
  // speed up sleeps
  const realSetTimeout = global.setTimeout; global.setTimeout = (f) => realSetTimeout(f, 0);
  let err = null;
  try { await fn(github, { repo: { owner: 'o', repo: 'r' }, payload: { pull_request: pr } }, core, proc); } catch (e) { err = e; }
  global.setTimeout = realSetTimeout;
  const ok = check({ w, out, err });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`, ok ? '' : JSON.stringify({ calls: w.calls, out, err: err && err.message, pulls: w.pulls }));
  if (!ok) process.exitCode = 1;
}

const feat = (n, extra = {}) => ({ number: n, title: `feat ${n}`, body: 'x', merged: true, base: { ref: 'dev' }, head: { ref: 'f', user: { login: 'MingJen' } }, user: { login: 'MingJen' }, labels: [], ...extra });
const relPR = (n, title, body = 'Created By Release Bot:\n \n#1 a | by u') => ({ number: n, title, body, base: { ref: 'master' }, head: { ref: 'dev', user: { login: 'o' } }, user: { login: 'bot' }, labels: [{ name: 'bot:release' }], state: 'open' });

(async () => {
  await run('dev merge, no release PR → create Release 8.29.12 + label', 'active', feat(5), { releases: [{ name: '8.29.11', tag_name: '8.29.11', draft: false }] },
    ({ w }) => w.pulls.length === 1 && w.pulls[0].title === 'Release 8.29.12' && w.pulls[0].labels[0].name === 'bot:release' && w.pulls[0].body === 'Created By Release Bot:\n \n#5 feat 5 | by MingJen');
  await run('dev merge, no releases at all → Release 0.0.1', 'active', feat(5), {}, ({ w }) => w.pulls[0].title === 'Release 0.0.1');
  await run('dev merge, existing release PR → append', 'active', feat(6), { pulls: [relPR(900, 'Release 1.0.1')] },
    ({ w }) => w.pulls[0].body.endsWith('\n#6 feat 6 | by MingJen') && w.calls.filter((c) => c[0] === 'pulls.create').length === 0);
  await run('dev merge, already recorded (re-run) → no write', 'active', feat(1), { pulls: [relPR(900, 'Release 1.0.1')] },
    ({ w }) => w.calls.length === 0);
  await run('dev merge, lost update → retry and keep line', 'active', feat(7), { pulls: [relPR(900, 'Release 1.0.1')], clobberOnce: true },
    ({ w, out }) => w.pulls[0].body.endsWith('#7 feat 7 | by MingJen') && out.warnings.length === 1);
  await run('dev merge, 422 No commits between → notice, no failure', 'active', feat(8), { releases: [{ name: '1.0.0', draft: false }], failCreate: httpErr(422, 'No commits between master and dev') },
    ({ out, err }) => !err && out.notices.length === 1);
  await run('dev merge, 422 already exists (race) → label + append', 'active', feat(9), {
      releases: [{ name: '1.0.0', draft: false }],
      pulls: [{ ...relPR(901, 'Release 1.0.1'), labels: [] }],
      failCreate: httpErr(422, 'A pull request already exists for o:dev.'),
    }, ({ w, err }) => !err && w.pulls[0].labels.length === 1 && w.pulls[0].body.endsWith('#9 feat 9 | by MingJen'));
  await run('dev merge, latestRelease 500 → fail (no 0.0.1 PR)', 'active', feat(10), { latestErr: httpErr(500, 'boom') }, ({ w, err }) => err && err.status === 500 && w.pulls.length === 0);
  await run('dry-run: dev merge → no writes', 'dry-run', feat(11), { releases: [{ name: '2.0.0', draft: false }] },
    ({ w, err }) => !err && w.calls.length === 0);
  await run('dry-run: release PR merged → no draft release', 'dry-run', { ...relPR(900, 'Release 2.0.1'), merged: true }, {},
    ({ w, err }) => !err && w.calls.length === 0);
  await run('release PR merged → draft release on master', 'active', { ...relPR(900, 'Release 8.29.12'), merged: true }, {},
    ({ w }) => JSON.stringify(w.calls) === JSON.stringify([['createRelease', '8.29.12', true, 'master']]) && w.releases[0].name === '8.29.12');
  await run('release PR merged, title renamed to minor bump → uses title', 'active', { ...relPR(900, 'Release 8.30.0'), merged: true }, {},
    ({ w }) => w.calls[0][1] === '8.30.0');
  await run('release PR merged, release already exists (manual) → skip', 'active', { ...relPR(900, 'Release 8.29.11'), merged: true }, { releases: [{ name: '8.29.11', tag_name: '8.29.11', draft: false, author: { login: 'MingJen' } }] },
    ({ w }) => w.calls.length === 0);
  await run('release PR merged, bad title → setFailed', 'active', { ...relPR(900, 'Release next'), merged: true }, {}, ({ w, out }) => w.calls.length === 0 && out.failed);
  await run('master PR without label → no-op', 'active', { ...relPR(900, 'Release 1.0.0'), labels: [], merged: true }, {}, ({ w }) => w.calls.length === 0);
  // next version must not collide with unpublished drafts / merged release PRs
  await run('next version: unpublished draft 0.46.6 newer than latest 0.46.5 → 0.46.7', 'active', feat(20), {
      releases: [{ name: '0.46.6', tag_name: '0.46.6', draft: true }, { name: '0.46.5', tag_name: '0.46.5', draft: false }],
    }, ({ w }) => w.pulls[0] && w.pulls[0].title === 'Release 0.46.7');
  await run('next version: merged release PR 8.30.0 without release → 8.30.1', 'active', feat(21), {
      releases: [{ name: '8.29.12', tag_name: '8.29.12', draft: false }],
      pulls: [{ ...relPR(800, 'Release 8.30.0'), state: 'closed', merged_at: '2026-10-22T00:00:00Z' }],
    }, ({ w }) => w.pulls.find((p) => p.state === 'open') && w.pulls.find((p) => p.state === 'open').title === 'Release 8.30.1');
  await run('next version: closed-unmerged release PR is ignored', 'active', feat(22), {
      releases: [{ name: '1.0.0', tag_name: '1.0.0', draft: false }],
      pulls: [{ ...relPR(801, 'Release 9.9.9'), state: 'closed', merged_at: null }],
    }, ({ w }) => w.pulls.find((p) => p.state === 'open').title === 'Release 1.0.1');
  await run('next version: numeric compare (8.10.0 > 8.9.9) and non-semver ignored', 'active', feat(23), {
      releases: [{ name: '8.9.9', tag_name: '8.9.9', draft: false }, { name: 'hotfix', tag_name: 'x', draft: true }, { name: '8.10.0', tag_name: '8.10.0', draft: true }],
    }, ({ w }) => w.pulls[0].title === 'Release 8.10.1');
  await run('next version: v-prefix kept', 'active', feat(24), { releases: [{ name: 'v1.2.0', tag_name: 'v1.2.0', draft: false }] },
    ({ w }) => w.pulls[0].title === 'Release v1.2.1');
})();
