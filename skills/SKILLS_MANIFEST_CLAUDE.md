# Software engineering & coding skills — provenance and safety scan

20 agent skills pulled from GitHub on **2026-09-30**. Every skill was cloned into a throwaway
quarantine folder and scanned before being copied here. A second, deeper review by a separate
reviewer then read every file by hand and found things the automated scan missed — those
corrections are in [What the first scan got wrong](#what-the-first-scan-got-wrong).

Ranked by the star count of the repository each skill came from. Stars are the only public
"rating" GitHub exposes, so that is what "highest rated" means here.

## Read this first

**No malware was found.** Nothing steals data, nothing hides a payload, nothing phones home
behind your back. But two skills do things you should decide about before using them:

- **`graphify` can rewire your agent.** Running its `install` command writes rules into
  `.claude/settings.json`, `~/.claude/CLAUDE.md` and your `.git/hooks`. One of those rules
  tells your agent to query graphify before reading your own source files, *and to copy that
  rule into every subagent it creates*. A `--strict` option lets it refuse your agent's file
  reads outright. The folder sitting here is inert — only the `install` command does this.
- **`pr-lens` uploads by default.** Ask it for a diagram and it puts a map of your codebase's
  architecture on `prlens.dev`, at a link that opens **without a login**. Fine for open source,
  bad for a client repo. It also runs `npx …@latest`, meaning it downloads and executes
  whatever that npm account published this minute, with no version pinned.

The other 18 are safe to use as they are.

## What is installed

| # | Skill | Source repo | Stars | License | Purpose |
|---|---|---|---|---|---|
| 1 | `test-driven-development` | obra/superpowers | 293,311 | MIT | Write the failing test before the implementation |
| 2 | `systematic-debugging` | obra/superpowers | 293,311 | MIT | Root-cause a bug before proposing a fix |
| 3 | `requesting-code-review` | obra/superpowers | 293,311 | MIT | Verify work meets standards before merge |
| 4 | `writing-plans` | obra/superpowers | 293,311 | MIT | Turn a spec into a multi-step plan before coding |
| 5 | `verification-before-completion` | obra/superpowers | 293,311 | MIT | Prove work is done before claiming it is |
| 6 | `coding-standards` | affaan-m/ECC | 270,015 | MIT | Naming, readability and immutability conventions |
| 7 | `backend-patterns` | affaan-m/ECC | 270,015 | MIT | API design, database and service architecture |
| 8 | `karpathy-guidelines` | multica-ai/andrej-karpathy-skills | 216,011 | none | Reduce common LLM coding mistakes |
| 9 | `mcp-builder` | anthropics/skills | 179,123 | none | Build MCP servers properly |
| 10 | `skill-creator` | anthropics/skills | 179,123 | none | Write, test and measure new skills |
| 11 | `webapp-testing` | anthropics/skills | 179,123 | none | Drive and test local web apps with Playwright |
| 12 | `graphify` ⚠️ | Graphify-Labs/graphify | 122,675 | Apache-2.0 | Turn a codebase into a queryable knowledge graph |
| 13 | `understand-explain` | Egonex-AI/Understand-Anything | 84,808 | MIT | Deep-dive explanation of a file, function or module |
| 14 | `understand-onboard` | Egonex-AI/Understand-Anything | 84,808 | MIT | Generate an onboarding guide for a project |
| 15 | `i-have-adhd` | ayghri/i-have-adhd | 52,316 | MIT | Lead with the answer; stop burying it in prose |
| 16 | `parallel-debugging` | wshobson/agents | 40,108 | MIT | Debug via competing hypotheses, evidence-led |
| 17 | `architecture-patterns` | wshobson/agents | 40,108 | MIT | Clean, hexagonal and layered architecture |
| 18 | `multi-reviewer-patterns` | wshobson/agents | 40,108 | MIT | Parallel code review across quality dimensions |
| 19 | `eli5` | DreambigOu/ELI5 | 1,569 | MIT | Explain code or errors at a chosen audience level |
| 20 | `pr-lens` ⚠️ | coldteadotai/pr-lens | 1,761 | MIT | Draw a change as an architecture / data-flow diagram |

Skills 13, 14, 15, 19 and 20 are the explanation-quality picks.

## Verdict per skill

**Clean — use as-is (12):** `test-driven-development`, `requesting-code-review`,
`writing-plans`, `verification-before-completion`, `karpathy-guidelines`, `mcp-builder`,
`understand-explain`, `understand-onboard`, `parallel-debugging`, `architecture-patterns`,
`multi-reviewer-patterns`, `eli5`.

**Worth knowing about (6):**

- `systematic-debugging` — ships four test fixtures (`test-pressure-*.md`, `test-academic.md`)
  written as live orders: *"This is a real scenario. You must choose and act."* plus invented
  urgency like *"Revenue loss: $15,000/minute"*. They exist to test the skill's nerve, but they
  sit loose in the folder and an agent that reads the whole directory may take them literally.
  **Recommend deleting those four files.**
- `coding-standards`, `backend-patterns` — `agents/openai.yaml` sets
  `allow_implicit_invocation: true`, so they can activate without being asked for.
- `webapp-testing` — tells the agent *"DO NOT read the source until you try running the script
  first"*. The script is 106 harmless lines, but "run it, don't read it" is a bad habit.
- `skill-creator` — teaches you to make skill descriptions *"pushy"* so they trigger *"even if
  they don't explicitly ask"*. Legitimate Anthropic advice; it is also how skills over-trigger.
- `i-have-adhd` — its output rules stick for the whole session and only stop on the exact phrase
  "stop adhd mode". By design, but persistent.

**Decide before use (2):** `graphify`, `pr-lens` — see [Read this first](#read-this-first) and
the detail below.

## What the first scan got wrong

The automated scan reported *"0 auto-run hooks — nothing executes on install"*. **That was
wrong.** It only looked for `hooks.json`, `settings.json`, `package.json` and `Makefile` sitting
as files inside the skill folders. It could not see machinery that gets written **at runtime**:

- `graphify/install.py:2004` writes `PreToolUse` hooks into `.claude/settings.json` (and the
  Codex, Gemini and CodeBuddy equivalents), matched on `Bash|Grep` and `Read|Glob`.
- The text those hooks inject is assembled at runtime in `graphify/cli.py:32-38`, so it appears
  in no file as prose: *"MANDATORY: … You MUST run graphify before reading source files … This
  rule applies to subagents too — include it in every subagent prompt."* That last clause makes
  it self-propagating.
- In `--strict` mode the hook returns `permissionDecision: deny` on your agent's first raw file
  read (`graphify/cli.py:57-68`). Off by default; `GRAPHIFY_HOOK_STRICT=0` and
  `GRAPHIFY_SKIP_HOOK=1` turn it off.
- `graphify/hooks.py:331-338` installs git `post-commit` and `post-checkout` hooks that spawn a
  detached rebuild with `CREATE_BREAKAWAY_FROM_JOB`. The docs
  (`graphify/skills/claude/references/hooks.md:7`) claim *"No background process needed"*, which
  contradicts the code.
- `graphify/skill.md:93` falls back to
  `pip install graphifyy -q --break-system-packages` — deliberately forcing past the protection
  that stops you breaking your system Python, with no prompt.
  **The odd package name `graphifyy` (double-y) is genuine, not a typo-squat** — checked against
  PyPI on 2026-09-30: it declares `github.com/Graphify-Labs/graphify` as its homepage, has 240
  releases, and was last published 2026-09-29. Plain `graphify` does not exist on PyPI at all,
  which is presumably why the author doubled the y. The forced install is still worth removing;
  the name is not the problem.
- `pr-lens` runs `npx @coldtea/pr-lens-cli@latest` in 13 places. The scan hunted `curl | sh`,
  not `npx`, so it sailed through. `pr-lens/SKILL.md:374` says *"Nothing here asks you to install
  a package first"* — true only because `npx` installs implicitly.

Everything else the first scan reported still holds: no binaries, no obfuscation, no
download-and-run chains, no destructive commands, no credential theft, no permission-bypass
flags (`--dangerously-skip-permissions`, `bypassPermissions` and `acceptEdits` return **zero**
hits across all 20 skills), and exactly one zero-width character in the whole set —
`graphify/llm.py:579`, where it is used *defensively* to defang jailbreak tokens.

## Where your data can go

Third-party endpoints that could receive your content:

| Domain | Skill | What goes there |
|---|---|---|
| `prlens.dev` | pr-lens | Your codebase's architecture map. **Default path, public without login.** |
| `app.graphify.com` | graphify | Hosted counterpart to a tool sold as on-device |
| `api.deepseek.com`, `api.moonshot.ai`, `api.openai.com`, `*.openai.azure.com`, `generativelanguage.googleapis.com` | graphify | Source code, only if you configure that provider |
| `gitlab.com` | pr-lens | Your own SVG upload, using `$GITLAB_TOKEN` |
| `api.anthropic.com` | graphify, mcp-builder | LLM calls |

Expected and harmless: `github.com`, `raw.githubusercontent.com`, `modelcontextprotocol.io`,
`claude.ai`, `www.apache.org`. CDNs used by local HTML: `unpkg.com`, `cdn.jsdelivr.net`,
`d3js.org`, `cdn.sheetjs.com` (integrity-hash pinned), Google Fonts.

In graphify's favour: it indexes MCP config files but records **env var names only, never
values** (`mcp_ingest.py:41-47`); its query log is off by default; `detect.py` refuses to index
`id_rsa`, `.netrc`, `.npmrc`, `.git-credentials`, `~/.ssh` and `~/.aws`; and `security.py` has a
real SSRF guard.

## Licence problem

`graphify` is Apache-2.0 but ships here with **no LICENSE, no NOTICE, and no copyright header in
any of its 228 files**. Apache-2.0 section 4 requires the licence text to travel with a
redistribution. Add the licence, or drop the skill, before this repo goes anywhere.

## Not installed

Good quality, too few stars for a star-ranked top 20: `dzhng/skills` (code-review,
refactor-clean, write-tests, eli5), `addyosmani/web-quality-skills` (accessibility, Core Web
Vitals, performance), `tobihagemann/turbo` (explain-this, investigate, review-pr),
`kharmanskyi/open-steps` (os-say-simple, os-ask-simple).

`alirezarezvani/claude-skills` (26,993 stars, 846 skills) was cloned and rejected on quality:
empty descriptions and duplicate names. It and `affaan-m/ECC` are bulk aggregations where many
skills are near-duplicates or machine translations of each other.

## Reproducing the scan

Quarantine clones, the scanner, the inventory of all 2,327 skills and the raw findings live in
the session scratchpad and are deleted with it. Re-run by cloning to a scratch folder and
pointing `scan-skills.ps1` at it.

Windows note: clone with `git -c core.longpaths=true`. Three of these repos exceed the 260
character path limit and fail with *"Clone succeeded, but checkout failed … Filename too long"*.
