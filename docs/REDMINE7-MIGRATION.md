# Redmine 7 migration: redmine_drawio

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. That includes the plugin's tests on
> PostgreSQL and MariaDB, every function exercised end to end on a real running Redmine in a
> browser (with and without permissions, failure paths included) with screenshots you looked at,
> and an OpenAI review of the diff when OPENAI_API_KEY is set. Report to me in Dutch at the end.

This file is the plan and the memory of that work. Update it as you go: verdicts, results,
what is left. Written 2026-10-06 from a measured analysis (report at the bottom).

## Status

| | |
|---|---|
| Plugin id | `redmine_drawio` |
| GEOxyz runs today | `master` |
| Upstream | mikitex70/redmine_drawio master @ ecf942ab2e6f48d82a438087a9a75e3a49083bc0 (2026-10-03); develop @ 6495a3a4d074b69d78bde6c4e07baaf63717200f |
| Runs on Redmine 7 as is | JA |
| Upstream sync | NIET NODIG: nothing: upstream master only adds the merge of GEOxyz's own PR #160; do NOT take develop 6495a3a (encrypts the API key server-side while drawioEditor.js:313 still base64/reverse-decodes it -> saving diagrams breaks) |
| After sync | n.v.t. |
| Complexity (1 trivial .. 5 rewrite) | 1 |
| Measured on | Redmine 7.0.1 (7.0-stable-GEOxyz + latest 7.0-stable), Rails 8.1.3.1, Ruby 3.3.6, PostgreSQL 16 and MariaDB 10.11 |
| Branch head when this file was written | `b1ca175` |
| Migration session (2026-10-06) | DONE, see "Result of the migration session" below. Branch tested on 7.0-stable-GEOxyz (PostgreSQL 16, MariaDB 10.11) and 5.1-stable (PostgreSQL 16) |

## Already on this branch

| commit | what |
|---|---|
| `eefb2bb` | Test for GEOxyz 29ddafa (macro dialog hook with a non-HTML request format). |
| `cdcbea1` | API key no longer in the page: the editor fetches it from `POST /drawio/api_key` (session + CSRF token, `Cache-Control: no-store`, only for users who may edit wiki pages or issues somewhere, 403 when the REST API is off) right before saving. Tests `test/integration/drawio_api_key_test.rb`, `view_hooks_test.rb`. |
| `9d4edaa` | `spec/spec_helper.rb`: the XSS system spec runs (it could not load before); second example with inline SVG, fails without the script filter. |
| `7aa9fb5` | Inline SVG: no more `!DOCTYPE svg PUBLIC ...` text above every diagram (regression from upstream 4b5fc8f, already on master). |
| `0cfed33` | Upload request URL-encodes the diagram name (names with `&`, `+`, `#` lost their image type). |
| `75bc422`, `a6ce52f`, `4bac31b`, `8bc06d9` | End-to-end scenarios for every function (`test/e2e/`, local diagrams.net stub in `test/e2e_support/`, plus one against the real embed.diagrams.net), screenshots for PostgreSQL (`docs/e2e/`), MariaDB (`docs/e2e/mariadb/`) and before pictures on 5.1 with master (`docs/e2e/before/`). |
| `c586635`, `0cfed33` | OpenAI review findings resolved (`docs/reviews/`). |

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Priority items**

1. Decide on the API key that is embedded (reversible) in every page; do not take upstream develop 6495a3a without the matching JS change.
   **DONE** (`cdcbea1`): key fetched on demand from `POST /drawio/api_key`; develop 6495a3a not taken. Choice recorded under "Open questions for Jan".

**Open items from the analysis** (Dutch; where they conflict with a decision or a priority item above, those win)

2. Current user's API key is embedded trivially reversible (base64+reverse) in every wiki/issue page (view_hooks.rb:121); upstream develop's fix breaks saving - needs a JS-side change too
   **DONE** with item 1. Before: `docs/e2e/before/wiki-png-edit-save.md` lists "page still embeds hashCode"; after: the scenario checks the page has no hashCode and exactly one POST to `/drawio/api_key` per save.
3. Add a plugin Gemfile (rspec-rails, capybara, selenium) if the XSS system spec should run in CI
   **DONE without a Gemfile** (`9d4edaa`): `.codex/test_setup.sh` already puts rspec-rails in `Gemfile.local`; capybara and selenium-webdriver are in Redmine's test group. A plugin Gemfile would ship test gems into production. Locally Chrome and chromedriver must match: here `SE_CHROMEDRIVER` (chromedriver 141) and `RMP_CHROME_BIN` (Playwright's Chromium 141); the GitHub runner has a matching pair.
4. Editor/save via diagrams.net not verified (external service)
   **DONE**: `test/e2e/real_diagrams_net.mjs` opens the real embed.diagrams.net from Redmine 7, adds an ellipse and saves (flow_1.png with the diagram source, `docs/e2e/real-diagrams-net-*.png`). All other save paths run against a local stub of the embed protocol so they do not depend on the service.

**Checks**

5. Run the plugin's whole test suite on Redmine 7.0-stable-GEOxyz with PostgreSQL AND MariaDB, and once on 5.1-stable if the branch is meant to stay 5.1-compatible.
   **DONE**, numbers under "Result of the migration session".
6. Check Redmine 7 webhooks against this plugin (see "Rules"), and note the result here even if nothing is needed.
   **Nothing needed**: the plugin adds no issue data and changes none; it only renders macros in the description/notes text, and the webhook payload (`issues/show.api.rsb`) carries that raw text, as the REST API always did. Saving a diagram goes through the REST API, so it triggers the normal issue-updated webhook like any API update.
7. Verify every feature of the plugin by hand on a running Redmine 7 (screenshots).
   **DONE**: inventory below, 14 plugin scenarios.

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject | verdict |
|---|---|---|---|
| `29ddafa` | 2026-10-01 | fix: diff in Redmine repositories throws 404 | KEEP. Upstream merged it (PR #160), Redmine 7 core does not make it superfluous: a hook partial rendered with the controller's lookup formats still raises `MissingTemplate` (404) when those are not `:html`. Test added: `test/functional/macro_dialog_format_test.rb` fails without `formats: [:html]` (`Missing partial redmine_drawio/_macro_dialog with formats [:text]`), passes with it. The original repository-diff URL did not reproduce on 7.0 in an integration test (11 diff/entry/annotate URL forms, 3 Accept headers, all 200 with and without the fix), so the test pins the hook, not the URL. |

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- No migrations, no new settings, no data fixes.
- Run `bundle exec rake assets:precompile RAILS_ENV=production` after deploying the plugin (or restart
  with fresh file times). Redmine 7 (Propshaft) recompiles at boot only when an asset file is newer than
  `public/assets/.manifest.json`; a deploy that keeps file times (`rsync -a`, `cp -p`, tar) leaves the old
  `drawioEditor.js` in place, and then saving a diagram keeps using the old code. Seen in this session.
- The REST API must stay enabled (Administration > Settings > **Integrations** in Redmine 7, the tab
  was "API" before), as before: diagrams are saved through it.
- Optional: until now every editable wiki/issue page carried the viewer's API key (reversible). If page
  sources may have been shared (saved HTML, support tickets, proxies that cache HTML), resetting API keys
  is the clean fix; nothing in this branch requires it.

## Result of the migration session (2026-10-06)

### Tests

| Redmine | database | minitest | rspec |
|---|---|---|---|
| 7.0-stable-GEOxyz (7.0.1, Rails 8.1.3.1, Ruby 3.3.6) | PostgreSQL 16.15 | 43 runs, 147 assertions, 0 failures, 0 errors, 2 skips | 2 examples, 0 failures |
| 7.0-stable-GEOxyz | MariaDB 10.11.14 | 43 runs, 147 assertions, 0 failures, 0 errors, 2 skips | 2 examples, 0 failures |
| 5.1-stable (Ruby 3.2.11) | PostgreSQL 16.15 | 43 runs, 141 assertions, 0 failures, 0 errors, 2 skips | 2 examples, 0 failures |
| 7.0-stable-GEOxyz + wiki_extensions, mermaid_macro, paste_as_wiki_tables (redmine70-migration) | PostgreSQL 16.15 | 41 runs, 147 assertions, 0 failures, 0 errors, 2 skips | 2 examples, 0 failures |

Baseline before any change (7.0-stable-GEOxyz): 33 runs, 91 assertions, 0 failures, 2 skips on both
databases; rspec could not load (`cannot load such file -- spec_helper`). The 2 skips are the DMSF tests
(DMSF is not installed; GEOxyz does not run it). The run count moves by 2 between runs because Rails
counts two route helpers (`test_email_url/path`) as tests depending on load order, as noted in the analysis.
Boot and eager loading: the production server (eager load on) started on every run; the plugin has no migrations.

### End to end (production mode, `./.codex/e2e.sh`)

| run | scripts | screenshots | problems |
|---|---|---|---|
| 7.0-stable-GEOxyz, PostgreSQL (`docs/e2e/`) | 16 (smoke, core, 14 plugin scenarios) | 66 | 0 |
| 7.0-stable-GEOxyz, MariaDB (`docs/e2e/mariadb/`) | 16 | 66 | 0 |
| 7.0-stable-GEOxyz + 3 other GEOxyz plugins, PostgreSQL (not committed) | 15 (before `special_filename`) | 65 | 0 |
| before: 5.1-stable with master 29ddafa (`docs/e2e/before/`) | 3 | 15 | the 3 expected old behaviours (DOCTYPE text, hashCode in page, so no key request) |

Every screenshot was opened and looked at. Smoke found 0 plugin GET routes (the plugin adds only
`POST /drawio/api_key`); its settings page is in the smoke set.

### Inventory of functions

| function | how a user reaches it | scenario | screenshots |
|---|---|---|---|
| `{{drawio_attach(name[.png])}}` png diagram, default image when missing, stored attachment | wiki page / issue text | `macro_rendering.mjs`, `wiki_png_edit_save.mjs` | `macro-rendering-png-attachment`, `wiki-png-edit-save-default-image` |
| xml / drawio diagrams through the diagrams.net viewer (zoom, toolbar) | wiki page | `macro_rendering.mjs` | `macro-rendering-xml-drawio` |
| `size=` option | macro option | `macro_rendering.mjs` | `macro-rendering-options` |
| deprecated `{{drawio}}` macro (message) | macro | `macro_rendering.mjs` | `macro-rendering-options` |
| svg diagrams: refused with the setting off, inline with it on | macro + admin setting | `macro_rendering.mjs` | `macro-rendering-svg-disabled`, `-svg-enabled` (before: `before/macro-rendering-svg-enabled`) |
| edit + save png on a wiki page (new attachment `_1`, macro rewritten, new version) | double click | `wiki_png_edit_save.mjs` | `wiki-png-edit-save-*` (6) |
| edit + save svg (inline) and xml (viewer toolbar Edit) | double click / toolbar | `svg_xml_edit_save.mjs` | `svg-xml-edit-save-*` (3) |
| edit + save in an issue description and in a note | double click | `issue_edit_save.mjs` | `issue-edit-save-*` (4) |
| names that need URL encoding | double click | `special_filename.mjs` | `special-filename-saved` |
| real diagrams.net editor | double click, default service URL | `real_diagrams_net.mjs` | `real-diagrams-net-*` (3) |
| empty diagram refused, exit without saving | editor | `editor_cancel_empty.mjs` | `editor-cancel-empty-*` (2) |
| who may edit: manager yes; reporter (wiki) and outsider read only; private project 403; anonymous read only; API key endpoint 200 / 422 without CSRF / 403 anonymous | page | `permissions.mjs` | `permissions-*` (5) |
| reporter on issues: editable through add_issue_notes (`Issue#editable?`) | issue | `issue_edit_save.mjs` | `issue-edit-save-reporter` |
| jsToolBar button + macro dialog (insert, edit in place, svg only when enabled), wiki and new issue form | editor toolbar | `toolbar_macro_dialog.mjs` | `toolbar-macro-dialog-*` (6) |
| plugin settings (service URL, svg switch, empty URL falls back to default, non-admin 403) | Administration > Plugins > Configure | `plugin_settings.mjs` | `plugin-settings-*` (4) |
| "Drawio UI" preference passed to the editor as `ui=` | My account | `my_account_ui.mjs` | `my-account-ui-*` (2) |
| REST API off: admin warning on every page, none for others, saving fails with an alert and stores nothing | Administration > Settings > Integrations | `rest_api_disabled.mjs` | `rest-api-disabled-*` (3) |
| PDF export of wiki page and issue (RBPDF patch for stored diagrams) | Also available in: PDF | `pdf_export.mjs` | `pdf-export-*` (3) |
| diagrams in notification mails | issue note | `mail_notification.mjs` | `mail-notification-mail` |
| hook: macro dialog for a non-HTML request format (GEOxyz 29ddafa) | every page | minitest `macro_dialog_format_test.rb` | - |
| `{{drawio_dmsf}}` macro and DMSF saving | DMSF module | not tested: DMSF not installed at GEOxyz (2 skipped tests) | - |
| CKEditor / TinyMCE toolbar adapters | other text formatting | not tested: GEOxyz uses CommonMark with jsToolBar | - |
| Easy Redmine branch | Easy Redmine | not applicable | - |

### Reviews

- Own review of the whole diff: no open finding. Checked in particular: `POST /drawio/api_key` is
  reachable only with the session and the CSRF token (an API key or `?format=json` makes the request an
  API request, where the session is ignored and the user is anonymous, so 403), the before_action stops on
  `head`, no SQL, no user input in HTML, no new user-visible strings (the failure shows the HTTP status
  text as before).
- OpenAI review (gpt-5), three rounds, every finding answered in `docs/reviews/`:
  `openai-2026-10-06-a6ce52f.md` (2 findings, fixed in `c586635`), `openai-2026-10-06-c586635.md`
  (3 findings: 1 fixed in `0cfed33`, 2 rejected with evidence), `openai-2026-10-06-0cfed33.md`: no findings.

### Found and not changed (pre-existing, also on master and/or Redmine 5.1)

- An unsupported extension (`{{drawio_attach(notes.txt)}}`) gives a macro error with the server path of
  the plugin (`No such file or directory @ rb_sysopen - .../spec/defaultImage.txt`): the extension check
  `/.*(\.(png|svg|xml|drawio))?$/` matches everything. Seen in `docs/e2e/macro-rendering-options.png`.
- `{{drawio_attach}}` without a name would raise in `strip_non_filename_chars(nil)` instead of showing
  "Please set a diagram name" (code reading, not run).
- PDF export of a diagram that has no attachment yet shows the tail of a base64 string instead of an
  image (RBPDF does not take the data: URI); same on 5.1 with master (`docs/e2e/before/pdf-export-wiki-default.png`).
  Stored diagrams are fine.
- Notification mails carry the editor attributes (`ondblclick`, title "Double click to edit diagram") for
  recipients who may edit; inert in a mail client.
- `RedmineDrawio::Macros.js_safe` always returns `''` (the `if` result is discarded), so `pageName` is
  always empty; saving works anyway (code reading).
- After a failed save (REST API off) the new image stays in the page until reload; nothing is stored.
- The inline default SVG has no width (viewBox only) and fills the column; upstream's scaling choice (#151).
- The REST API warning says "Administration -> Configuration -> API"; the tab is "Integrations" in Redmine 7
  (10 locales; left for a later change, see questions).
- SVG sanitizer (upstream 4b5fc8f) is a denylist (`<script>`, `on*`, `javascript:` values); no allowlist,
  `foreignObject` and `<animate values=...>` lists not handled. Only relevant with "Enable SVG diagrams" on.

Kit notes (not in this plugin): `.codex/test_setup.sh` runs `$SUDO -u postgres` with an empty `$SUDO`
when root (role created by hand here); `start_server.sh` keeps a pipe open when its output is piped
(`| tail`), so pipe it to a file; with `mise` on the PATH, `common.sh` picks Ruby 3.4 for Redmine 7
(set `MISE_BIN` to a missing path to use the system Ruby).

### Open questions for Jan

1. **API key**: built `POST /drawio/api_key` (key fetched only when saving, session + CSRF, no-store,
   only for users who may edit wiki pages or issues somewhere). Options were: (a) leave it in the page
   (status quo), (b) upstream develop 6495a3a (server-side encryption; breaks saving, and the browser must
   be able to decrypt it anyway, so it hides nothing), (c) this endpoint, (d) save without the REST API
   through a plugin controller (no API key at all, REST API no longer needed; a rewrite of the save flow).
   Recommendation: keep (c) now, consider (d) later. Note: (c) hands the key out without the sudo
   password that `/my/api_key` asks for; before, it was in the page with no check at all.
   Also recommended: tell upstream (mikitex70) that develop 6495a3a breaks saving.
2. **Two fixes outside the strict migration**: DOCTYPE text above inline SVG (`7aa9fb5`) and the URL
   encoding of the upload (`0cfed33`). Both small, tested, 5.1-compatible; recommendation: keep them and
   offer them upstream.
3. **SVG sanitizer**: replace the denylist by an allowlist (Loofah/Rails sanitizer with SVG elements) in a
   separate change, or keep "Enable SVG diagrams" off (default). Recommendation: keep it off unless needed.
4. **REST API warning text** mentions the old "API" tab; update the 10 locales to "Integrations" for
   Redmine 7 (and keep "API" on 5.1/6.1?). Recommendation: a small follow-up once 5.1 is gone.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```

```sh
./.codex/start_server.sh       # real Redmine (production mode) with this plugin, seeded users and projects
./.codex/e2e.sh                # browser: smoke over the plugin's pages, core issue flows, test/e2e/*.mjs
./.codex/openai_review.sh      # independent OpenAI review of the diff, only when OPENAI_API_KEY is set
```
Write one scenario per function in `test/e2e/<function>.mjs` (example at the top of
`.codex/e2e/lib.mjs`); screenshots and a table per scenario land in `docs/e2e/`. Users:
`admin`, `manager` (every permission), `reporter` (no plugin permissions), `outsider` (no
membership); password `Redmine7Test!`. Needs Node with Playwright and Chromium
(`npm install -g playwright && npx playwright install --with-deps chromium`).

On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow (tick
"e2e" for the browser run; screenshots come back as an artifact).

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline, before you change anything**:
   - the plugin's tests on Redmine 7.0-stable-GEOxyz with PostgreSQL and with MariaDB;
   - a real running Redmine with this plugin (`./.codex/start_server.sh`) and the browser run
     (`./.codex/e2e.sh`: smoke over every page the plugin adds, plus the core issue flows).
   Write the numbers here. Something already broken now is a finding, not your regression.
3. **Inventory of functions**: list every function of the plugin in this file, in a table
   "function | how a user reaches it | scenario | screenshot". Take them from the README,
   `init.rb` (permissions, menus, settings, project modules), routes, hooks and view
   overrides, macros, mail handling, API endpoints, rake tasks and cron jobs. This table is the
   coverage list for step 8; a function that is not in it will not be tested.
4. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
5. **Work list**: then the numbered list, in order. One concern per commit.
6. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **End to end, visually, every function**: on the real Redmine from `start_server.sh`
   (production mode, the way GEOxyz runs it), write one scenario per function in
   `test/e2e/<function>.mjs` with `.codex/e2e/lib.mjs` and run them with `./.codex/e2e.sh`.
   - Each function as the users that matter: `admin`, `manager` (every permission, the
     plugin's included), `reporter` (member without the plugin's permissions), `outsider`
     (no membership, private project must stay invisible).
   - The failure paths too: setting off, permission absent, empty state, invalid input, the
     value that used to raise. A refusal that is shown is evidence as much as a success.
   - One screenshot per function and per path, with a caption saying what it proves. Open
     every screenshot and look at it: a picture nobody looked at proves nothing. Commit them
     in `docs/e2e/` and list them in the inventory table.
   - Functions without a page (mail in and out, REST API, rake tasks, cron, webhooks): exercise
     them against the same running instance (mails land in `redmine/tmp/mails`, `t.mails()`
     reads them; API through `t.page.request`) and record command and result.
   - Before pictures where behaviour or layout changes: the branch GEOxyz runs today, on
     Redmine 5.1, same scenarios, `RMP_E2E_OUT=docs/e2e/before`.
   - Run the whole e2e set once on MariaDB as well (`RMP_DB=mariadb`, then `start_server.sh --reset`).
9. **Independent review**: first your own, adversarial: re-read the whole diff as if someone
   else wrote it and you are paid to reject it. Then, **when `OPENAI_API_KEY` is set in the
   session**, `./.codex/openai_review.sh`: it sends the diff of this branch to an OpenAI model
   and writes `docs/reviews/openai-<date>-<sha>.md`. Every finding gets a `Resolution:` line
   there (fixed in <commit>, with a test, or why not). Fix, re-run the tests and the e2e set,
   and run the review again until it has nothing new that you accept. Without the key: write
   "OpenAI review: skipped, no OPENAI_API_KEY" in the report; never send code anywhere else.
10. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
    settings, cron, files, removed features) goes into the section "After the upgrade".
11. **Finish**: update "Status", the inventory and the work list in this file, push
    `redmine70-migration`, and report: what changed, test numbers on both databases, e2e
    numbers (scenarios, screenshots, problems), the review result, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service (the OpenAI review of the code diff is the
  one exception Jan approved, and only when the key is present);
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint, browser check or review as passed without having seen
  it. Quote the summary lines; list the screenshots. "Should work" is not a result, and a green
  test suite is not proof that a feature works in the browser.
- **Tests**: never skip, delete or weaken a test. A test that encodes Redmine 5 markup or
  behaviour is updated to Redmine 7, with the reason in the commit. Every fix gets a test that
  fails without it.
- **Minimal diffs** in the plugin's own style. No reformatting, no unrelated refactoring.
  Something wrong elsewhere: write it down here, do not fix it in passing.
- **Security**: authorization on every action and entry point; `safe_attributes`, never
  `to_unsafe_hash` into `update`; no SQL built from params; no secrets in logs; no `html_safe` on
  user input.
- **Webhooks (new in Redmine 7)**: core sends issue payloads (core `issues/show.api.rsb`, rendered
  as the webhook owner) to webhook endpoints, past plugin hooks and controller patches. If the
  plugin hides, adds or changes issue data, make webhooks consistent with that or record why not.
- **Redmine 7 conventions**: SVG icons through `sprite_icon` (the `icon icon-*` CSS is gone),
  Propshaft assets under `assets/` (`/assets/plugin_assets/<id>/...`), the new header and user menu,
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module, sudo mode
  (on by default: `t.sudo()` in a scenario). The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why). Push after every
  commit, together with the updated status in this file: a cloud session can stop at a usage
  limit, and work that is not pushed is lost with its container.
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every function in the inventory exercised end to end on a real running Redmine, with and
  without permissions and on its failure paths; `./.codex/e2e.sh` green; screenshots looked at,
  committed in `docs/e2e/` and listed.
- Review done: your own, and the OpenAI review when the key is present, every finding resolved
  in `docs/reviews/`.
- No new failure when run together with the other GEOxyz plugins.
- "After the upgrade" lists every action production needs; "Status" is current.


## Analysis report (2026-10-06, Dutch)

# redmine_drawio
- Gebruikte branch: master @ 29ddafa (2026-10-01) - plugin id redmine_drawio, versie 1.5.5
- Upstream: mikitex70/redmine_drawio - upstream HEAD master @ ecf942a (2026-10-03); develop @ 6495a3a (2026-10-03)
- Fork t.o.v. upstream: 0 eigen commits die upstream niet heeft (29ddafa is via PR #160 upstream gemerged), 1 upstream-commit ontbreekt: de merge-commit ecf942a zelf, zonder inhoudsverschil (`git diff 29ddafa ecf942a` leeg).
- Andere relevante branches: upstream `develop` (= master + 6495a3a "remove hardcoded secret in view_hooks.rb", 6d73ab8/dae53c2 zijn dezelfde patches als op master).

## 1. Werkt out of the box op Redmine 7?   JA
- Harness (`results/1006-085043-s1-redmine_drawio_origin_master`): boot OK, eager OK, migraties OK, minitest 33 runs / 91 assertions / 0 failures / 0 errors / 2 skips, smoke 60/60. Bij de herhaalde run is het 31 runs, 91 assertions: 2 helpermethodes `test_email_url/test_email_path` worden afhankelijk van de seed als test meegeteld. Geen echt verschil.
- rspec: `spec/system/cross_site_scripting_spec.rb` (1 system spec, Capybara + browser). De plugin heeft geen Gemfile en declareert dus geen rspec. De gecorrigeerde harness meldt `FAIL rspec: no summary (rc=1)`, maar de log zegt `can't find executable rspec for gem rspec-core ... not currently included in the bundle` = geen rspec in de bundle (geen testfout). Het WARN-patroon van de harness herkent deze Bundler-4-melding niet.
- Macro-rendering op R7 (browser, wiki + issue, CommonMark): `{{drawio_attach(myDiagram)}}` -> `<img class="drawioDiagram" src="data:image/png;base64,...">` (standaarddiagram geladen, dubbelklik -> `editDiagram(...)`). `{{drawio_attach(other.svg, size=200)}}` -> inline SVG. `{{drawio_attach(x.xml)}}` -> `.mxgraph`-div. In de issue-description hetzelfde. jsToolBar-knop `jstb_drawio_attach` aanwezig in de wiki- en issue-editor, icoon via `/assets/plugin_assets/redmine_drawio/...` (Propshaft OK). `Drawio`-global aanwezig. Macro-output komt na de Loofah-sanitizer, dus wordt niet gestript. De plugin saneert SVG zelf (upstream 4b5fc8f, aanwezig).
- Niet geverifieerd: de editor zelf (embed.diagrams.net is extern) en opslaan via de REST API.

## 2. Upstream sync?   NIET NODIG
- Upstream master heeft niets nieuws (alleen de merge van GEOxyz' eigen PR).
- Upstream `develop` 6495a3a **niet** overnemen: die versleutelt de API-key server-side (`MessageEncryptor`), terwijl `assets/javascripts/drawioEditor.js:313` (`getHash()`) die nog als base64-omgekeerde string decodeert voor de `X-Redmine-API-Key`-header (`drawioEditor.js:420,559,574,587`). Opslaan van diagrammen breekt dan. De onderliggende zorg is terecht: de API-key van de ingelogde gebruiker staat triviaal omkeerbaar in elke wiki- en issuepagina (`lib/redmine_drawio/hooks/view_hooks.rb:121`).

## 3. Werkt na sync op Redmine 7?   n.v.t.

## 4. Complexiteit en blokkers   score 1
- Blokkers: geen.
- Stille breuken: geen gevonden. `Redmine::WikiFormatting::Markdown` en `alias_method_chain` staan achter versiechecks (`helpers/markdown_helper.rb:6,29`). Hardcoded `plugin_assets/redmine_drawio/...`-paden staan alleen in de TinyMCE/CKEditor-takken (`drawio_jstoolbar.js:172`, `drawioEditor.js:744`); GEOxyz gebruikt jsToolBar (niet geverifieerd voor CKEditor/TinyMCE).
- Beveiliging (bestaand, niet R7): API-key in de pagina (zie 2).
- Overlap met Redmine 7 core: geen (core heeft geen diagrameditor; SVG-preview #44126 gaat over bijlagen, niet over macro's).
- Open werk voor ansif:
  1. Beslissen over de API-key-blootstelling: niet develop 6495a3a overnemen zonder bijbehorende JS-wijziging. Upstream melden dat develop het opslaan breekt.
  2. Eventueel een plugin-Gemfile met rspec-rails/capybara/selenium als de XSS system spec in CI moet draaien.

## Branch redmine70-migration
- Basis: origin/master @ 29ddafa (geen wijzigingen nodig)
- Commits: geen (branch = origin/master)
- Eindresultaat harness (`results/1006-093003-s1-redmine_drawio_redmine70-migration`, gecorrigeerde harness): boot OK, eager OK, migraties OK, minitest 31 runs / 91 assertions / 0 failures / 0 errors / 2 skips, rspec niet uitvoerbaar (geen rspec-gem; harness toont FAIL "no summary"), smoke 60/60
- Rollback migraties: n.v.t. (geen migraties)

