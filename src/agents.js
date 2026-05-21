export const AGENTS = {
  amp: {
    key: 'amp',
    name: 'Amp',
    hint: 'ampcode.com',
    generates: ['AGENTS.md'],
  },
  claude_code: {
    key: 'claude_code',
    name: 'Claude Code',
    hint: 'by Anthropic',
    generates: ['CLAUDE.md', '.mcp.json'],
  },
  codex: {
    key: 'codex',
    name: 'Codex',
    hint: 'by OpenAI',
    generates: ['AGENTS.md', '.codex/config.toml'],
  },
  copilot: {
    key: 'copilot',
    name: 'GitHub Copilot',
    hint: 'by GitHub',
    generates: ['AGENTS.md'],
  },
  cursor: {
    key: 'cursor',
    name: 'Cursor',
    hint: 'cursor.sh',
    generates: ['.cursor/rules/js-boost.mdc', '.cursorrules'],
  },
  gemini: {
    key: 'gemini',
    name: 'Gemini',
    hint: 'by Google',
    generates: ['AGENTS.md'],
  },
  junie: {
    key: 'junie',
    name: 'Junie',
    hint: 'by JetBrains',
    generates: ['.junie/guidelines.md', '.junie/mcp.json'],
  },
  kiro: {
    key: 'kiro',
    name: 'Kiro',
    hint: 'by Amazon',
    generates: ['.kiro/steering/guidelines.md'],
  },
  opencode: {
    key: 'opencode',
    name: 'OpenCode',
    hint: 'opencode.ai',
    generates: ['AGENTS.md'],
  },
};

/** Agents that consume the shared AGENTS.md format */
export const AGENTS_MD_CONSUMERS = ['amp', 'codex', 'copilot', 'gemini', 'opencode'];

/** Agents that consume .mcp.json */
export const MCP_JSON_CONSUMERS = ['claude_code'];
