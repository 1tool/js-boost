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

Interactive wizard to add, remove, or toggle MCP servers. Changes are saved to `js-boost.config.json` — run `generate` afterwards to apply them to agent files.

```bash
npx @1tool/js-boost mcp
```

**Add a remote server:**
```
✔ Server key: my-api
✔ Server type: Remote (HTTP / SSE url)
✔ URL: https://my-mcp.com/mcp
✔ Description (optional): Internal API tools
```

**Add a local (stdio) server:**
```
✔ Server key: local-tools
✔ Server type: Local (stdio process)
✔ Command: node
✔ Arguments: ./mcp-server.js --port 3000
✔ Environment variables: API_KEY=secret,NODE_ENV=production
```

### `@1tool/js-boost generate`

Reads `.ai/guidelines/*.md` and `.ai/skills/*/SKILL.md`, then generates files for all selected agents. Falls back to generating all supported formats if no agents are configured.

```bash
npx @1tool/js-boost generate
npx @1tool/js-boost gen             # alias
npx @1tool/js-boost generate --verbose
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

MCP server definitions live in `.ai/mcp/mcp.json` (managed by `js-boost mcp`):

```json
{
  "servers": {
    "my-api": {
      "type": "remote",
      "url": "https://my-mcp.com/mcp",
      "description": "Internal API tools"
    },
    "local-tools": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-server.js"],
      "env": { "API_KEY": "secret" }
    }
  },
  "disabled": []
}
```

Agent selection and project metadata live in `js-boost.config.json` (managed by `init` / `agents`):

```json
{
  "projectName": "my-app",
  "projectDescription": "",
  "agents": ["claude_code", "cursor", "codex"]
}
```

MCP servers are written to the right format per agent:

| Agent | Format | Remote servers |
|---|---|---|
| Claude Code, Codex | `.mcp.json` | wrapped in `mcp-remote` |
| Junie | `.junie/mcp.json` | referenced by URL directly |

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