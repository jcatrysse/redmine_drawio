# Redmine 7 migration: redmine_drawio

Start a Claude Code (or Codex) session on this repository, branch `redmine70-migration`, with:

> Read CLAUDE.md and docs/REDMINE7-MIGRATION.md, then carry out the Redmine 7 migration of this
> plugin as described there, on branch redmine70-migration. Report to me in Dutch at the end.

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
| Branch head when this file was written | `29ddafa` |

## Already on this branch

- nothing: the branch equals the branch GEOxyz runs today.

## Work list for the migration session

In this order: things that break, security, the GEOxyz changes, the open items, then the checks.

**Priority items**

1. Decide on the API key that is embedded (reversible) in every page; do not take upstream develop 6495a3a without the matching JS change.

**Open items from the analysis** (Dutch; where they repeat a priority item, the priority item wins)

2. Current user's API key is embedded trivially reversible (base64+reverse) in every wiki/issue page (view_hooks.rb:121); upstream develop's fix breaks saving - needs a JS-side change too
3. Add a plugin Gemfile (rspec-rails, capybara, selenium) if the XSS system spec should run in CI
4. Editor/save via diagrams.net not verified (external service)

**Checks**

5. Run the plugin's whole test suite on Redmine 7.0-stable-GEOxyz with PostgreSQL AND MariaDB, and once on 5.1-stable if the branch is meant to stay 5.1-compatible.
6. Check Redmine 7 webhooks against this plugin (see "Rules"), and note the result here even if nothing is needed.
7. Verify every feature of the plugin by hand on a running Redmine 7 (screenshots).

## GEOxyz changes to review or re-apply

These GEOxyz commits are on the branch GEOxyz runs today and therefore on this branch. Review each one against the code it now sits on (upstream merges and Redmine 7 core): drop it if upstream or core now does the same, rewrite it if it is not up to the quality rules below (tests, I18n, security, portability), keep it otherwise. Record the verdict per commit in this file.

| commit | date | subject |
|---|---|---|
| `29ddafa` | 2026-10-01 | fix: diff in Redmine repositories throws 404 |

## After the upgrade (production)

Actions the person doing the upgrade must take, or know about, for this plugin:

- None known. Add here what the session finds.

## How to test

```sh
./.codex/redmine_clone.sh 7.0-stable-GEOxyz      # or 5.1-stable / 6.1-stable / 7.0-stable
./.codex/test_setup.sh                                 # RMP_DB=mariadb for MariaDB, RMP_PROVISION_DB=0 if a server runs
./.codex/test_plugin.sh                                # minitest + rspec of this plugin
```
On GitHub the same runs by hand only: Actions > "Redmine tests (manual)" > Run workflow.

The coordinator's harness (`plugin-check.sh` in the migration kit, kept outside this repo) adds a
browser smoke test of every page the plugin adds and runs all GEOxyz plugins together; the
results quoted in the analysis come from it.

## How the migration session works (same for every plugin)

1. **Start**: `git fetch && git checkout redmine70-migration && git pull`. Read this whole file,
   including the analysis report at the bottom. Do not reopen decisions recorded here.
2. **Baseline**: set up Redmine 7.0-stable-GEOxyz and run the plugin's tests on PostgreSQL and
   on MariaDB (see "How to test"). Write the numbers here before you change anything.
3. **GEOxyz changes**: go through the table above, one item at a time. Each kept or re-made change
   is its own commit with a test that proves it. Record the verdict in the table.
4. **Work list**: then the numbered list, in order. One concern per commit.
5. **Portability**: everything must run on Redmine's supported databases (PostgreSQL,
   MySQL/MariaDB; SQLite where the plugin already supports it). Migrations must be reversible and
   are run down and up on PostgreSQL and MariaDB.
6. **Browser**: start a Redmine 7 with this plugin, exercise every feature as admin and as a
   normal user with and without the plugin's permissions, and save screenshots (before on 5.1 or
   the old branch, after on 7.0) where behaviour or layout matters.
7. **Together**: run with the other GEOxyz plugins installed (the migration kit's harness, or
   `RMP_EXTRA_PLUGINS`). A failure that only appears in combination is a finding to record here.
8. **After the upgrade**: anything the production upgrade must do for this plugin (data fixes,
   settings, cron, files, removed features) goes into the section "After the upgrade".
9. **Finish**: update "Status" and the work list in this file, push `redmine70-migration`, and
   report: what changed, test numbers on both databases, what is left, what needs Jan.

### Stop and ask Jan when
- a GEOxyz change would be lost or behave differently for users;
- a new gem, a new setting with user impact, or a schema change not required by Redmine 7 seems needed;
- the change would send data to an external service;
- upstream and GEOxyz disagree on behaviour and both are defensible.

## Rules

- **Target**: Redmine 7.0-stable-GEOxyz (https://github.com/jcatrysse/redmine), Rails 8.1, Ruby 3.3+.
  Core sources for comparison: branches `5.1-stable`, `6.1-stable`, `7.0-stable`, `7.0-stable-GEOxyz`.
- **Evidence**: never report a test, lint or browser check as passed without having seen it.
  Quote the summary lines. "Should work" is not a result.
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
  `ContextMenus::*Controller`, Loofah-based text formatting, Chart.js as an ES module.
  The breaker list is in the migration kit's CHECKLIST.md.
- **Locales**: keep the locales the plugin ships in sync; translate a new key by matching the
  closest existing key in the same file, not from scratch; do not add new languages.
- **5.1 compatibility**: prefer fixes that also run on Redmine 5.1 so they can be merged early;
  say so when a fix cannot.
- **Git**: work on `redmine70-migration` only; never push to the default branch; never force-push
  a branch someone else uses. Descriptive commit messages (what and why).
- **GitHub Actions**: manual only (`workflow_dispatch`). Do not add push, pull_request or schedule
  triggers.

## Definition of done

- All items of the work list are done or explicitly deferred with a reason, in this file.
- The plugin's tests are green on Redmine 7.0-stable-GEOxyz with PostgreSQL and MariaDB
  (numbers in this file); boot, production-like eager load, migrations up/down OK.
- Every feature verified by hand on Redmine 7; screenshots listed.
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

