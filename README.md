# ⚡ js-boost

> Laravel Boost for JavaScript — generate agent files for Claude Code, Cursor, Junie, Codex, Copilot, Kiro, and more from a single `.ai/` source of truth.

Instead of manually maintaining separate instruction files for each AI agent, you write your guidelines and skills once in `.ai/` and `@1tool/js-boost` generates all the agent-specific files automatically.

---

## How it works

```
.ai/
├── guidelines/
│   ├── general.md       ← coding conventions
│   └── testing.md       ← testing standards
├── skills/
│   └── my-skill/
│       └── SKILL.md     ← on-demand skill (loaded when relevant)
└── mcp/
    └── mcp.json         ← MCP server definitions
```

Run `npx @1tool/js-boost generate` and get the right file for each configured agent:

| File | Agent |
|---|---|
| `AGENTS.md` | Amp, Codex, GitHub Copilot, Gemini, OpenCode |
| `CLAUDE.md` | Claude Code |
| `.mcp.json` | Claude Code + Codex |
| `.junie/guidelines.md` + `.junie/mcp.json` | JetBrains Junie |
| `.cursor/rules/js-boost.mdc` + `.cursorrules` | Cursor |
| `.kiro/steering/guidelines.md` | Kiro |

---

## Quick Start

```bash
# 1. Scaffold .ai/ and select your agents
npx @1tool/js-boost init

# 2. Edit guidelines and skills in .ai/

# 3. Generate agent files
npx @1tool/js-boost generate

# 4. (Optional) Watch mode — auto-regenerate on save
npx @1tool/js-boost watch
```

---

## Commands

### `@1tool/js-boost init`

Scaffolds the `.ai/` folder with placeholder guidelines and a starter skill. Prompts you to select which AI agents to configure and saves the selection to `js-boost.config.json`.

```bash
npx @1tool/js-boost init
npx @1tool/js-boost init --force    # overwrite existing files
npx @1tool/js-boost init --dir ./my-project
```

### `@1tool/js-boost agents`

Re-run the agent selection prompt without re-scaffolding `.ai/`. Use this to add or remove agents after the initial setup.

```bash
npx @1tool/js-boost agents
```

### `@1tool/js-boost mcp`

Interactive wizard for managing MCP servers. Team server definitions are stored in `.ai/mcp/mcp.json` (committed). Per-developer enable/disable state is stored in `.js-boost.json` (gitignored). Run `generate` afterwards to apply changes to agent files.

```bash
npx @1tool/js-boost mcp
```

The wizard offers three actions:

**Add a remote server** — HTTP/SSE endpoint with optional auth headers:
```
✔ Server key     my-api
✔ Server type    Remote (HTTP / SSE url)
✔ URL            https://my-mcp.com/mcp
✔ Headers        Authorization: Bearer YOUR_TOKEN_HERE
✔ Description    Internal API tools
```

**Add a local server** — stdio process with optional args and env vars:
```
✔ Server key              local-tools
✔ Server type             Local (stdio process)
✔ Command                 node
✔ Arguments               ./mcp-server.js --port 3000
✔ Environment variables   API_KEY=secret,NODE_ENV=production
```

**Enable / disable servers locally** — multiselect over all configured servers. Unchecked servers are added to `disabledMcpServers` in `.js-boost.json` and excluded from your generated files without affecting teammates.

### `@1tool/js-boost generate`

Reads `.ai/guidelines/*.md` and `.ai/skills/*/SKILL.md`, then generates files for all selected agents. On first run (no `.js-boost.json`), prompts for agent selection inline.

```bash
npx @1tool/js-boost generate
npx @1tool/js-boost gen                              # alias
npx @1tool/js-boost generate --verbose               # show skipped files
npx @1tool/js-boost generate --agents claude_code,cursor  # CI one-off, not saved
```

### `@1tool/js-boost watch`

Watches `.ai/` for changes and regenerates automatically (debounced 300ms).

```bash
npx @1tool/js-boost watch
```

### `@1tool/js-boost status`

Shows configured agents, guidelines, skills, MCP servers, and which files will be generated.

```bash
npx @1tool/js-boost status
```

---

## Supported Agents

| Key | Agent | Auto-detected |
|---|---|---|
| `amp` | Amp | `amp` in PATH or `~/.amp` |
| `claude_code` | Claude Code | `~/.claude` |
| `codex` | Codex | `codex` in PATH |
| `copilot` | GitHub Copilot | — |
| `cursor` | Cursor | `~/.cursor` |
| `gemini` | Gemini | — |
| `junie` | JetBrains Junie | `.junie/` in project |
| `kiro` | Kiro | `~/.kiro` |
| `opencode` | OpenCode | `opencode` in PATH |

During `init` (and `agents`), installed agents are pre-selected automatically based on what's detected on your system.

---

## Configuration

### `.ai/mcp/mcp.json` — team MCP servers

Committed to the repo. Defines the MCP servers available to the whole team. Managed by `js-boost mcp`.

```json
{
  "mcpServers": {
    "my-remote": {
      "type": "http",
      "url": "https://my-mcp.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    },
    "my-local": {
      "command": "node",
      "args": ["./mcp-server.js", "--port", "3000"],
      "env": {
        "API_KEY": "secret"
      }
    },
    "npm-package": {
      "command": "npx",
      "args": ["-y", "@some/mcp-server"]
    }
  }
}
```

Server types:

| Field | When to use |
|---|---|
| `type: "http"` + `url` | Remote HTTP/SSE server |
| `command` (no type) | Local stdio process |
| `headers` | Auth headers for remote servers (e.g. `Authorization`) |
| `args` | Command-line arguments |
| `env` | Environment variables injected into the process |

Remote servers are written differently per agent:

| Agent file | Remote format |
|---|---|
| `.mcp.json` (Claude Code, Codex) | Wrapped in `mcp-remote` with `--header` args |
| `.junie/mcp.json` | URL referenced directly |

### `.js-boost.json` — per-developer config

Gitignored. Created by `js-boost init`, updated by `js-boost agents` and `js-boost mcp`.

```json
{
  "agents": ["claude_code", "cursor", "codex"],
  "guidelines": true,
  "skills": ["example-skill"],
  "disabledMcpServers": ["my-remote"]
}
```

| Field | Description |
|---|---|
| `agents` | Which agents to generate files for |
| `guidelines` | Set to `true` after first successful generate |
| `skills` | Snapshot of skill names at last generate |
| `disabledMcpServers` | Server keys to exclude from your generated files |

---

## Skills

Skills in `.ai/skills/` use a `SKILL.md` with YAML frontmatter:

```markdown
---
name: my-skill
description: Use this skill when doing X.
---

# My Skill

Steps, patterns, and examples...
```

- **Claude Code** loads skills on-demand based on the `description`
- **Codex** supports `$skill-name` invocation and implicit matching
- **Junie / Cursor / Kiro** receive a reference list pointing to each `SKILL.md`

---

## License

MIT