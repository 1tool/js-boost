export const DEFAULT_MCP_SERVERS = {};

/**
 * Merge team servers (.ai/mcp/mcp.json) with per-developer disabled list (.js-boost.json)
 */
export function buildMcpServers(mcpConfig = {}, localConfig = {}) {
  const userServers = mcpConfig.mcpServers || {};
  const disabled = new Set(localConfig.disabledMcpServers || []);

  const servers = {};

  for (const [key, server] of Object.entries(DEFAULT_MCP_SERVERS)) {
    if (!disabled.has(key)) {
      servers[key] = server;
    }
  }

  for (const [key, server] of Object.entries(userServers)) {
    if (!disabled.has(key)) {
      servers[key] = server;
    }
  }

  return servers;
}

/**
 * Generate .mcp.json (Claude Code + Codex)
 * - stdio: detected by presence of `command` (no type field)
 * - remote: type === 'http', wrapped in mcp-remote, headers passed as --header args
 */
export function generateMcpJson(servers) {
  const mcpServers = {};

  for (const [key, server] of Object.entries(servers)) {
    if (server.type === 'http') {
      const args = ['-y', 'mcp-remote', server.url];
      if (server.headers) {
        for (const [k, v] of Object.entries(server.headers)) {
          args.push('--header', `${k}: ${v}`);
        }
      }
      mcpServers[key] = { command: 'npx', args };
    } else if (server.command) {
      mcpServers[key] = {
        command: server.command,
        args: server.args || [],
        ...(server.env ? { env: server.env } : {}),
      };
    }
  }

  return JSON.stringify({ mcpServers }, null, 2);
}

/**
 * Generate .junie/mcp.json — remote servers referenced by URL directly
 */
export function generateJunieMcpJson(servers) {
  const mcpServers = {};

  for (const [key, server] of Object.entries(servers)) {
    if (server.type === 'http') {
      mcpServers[key] = { url: server.url };
    } else if (server.command) {
      mcpServers[key] = {
        command: server.command,
        args: server.args || [],
        ...(server.env ? { env: server.env } : {}),
      };
    }
  }

  return JSON.stringify({ mcpServers }, null, 2);
}

/**
 * Generate human-readable MCP section for markdown files
 */
export function buildMcpMarkdownSection(servers) {
  const lines = ['## MCP Servers', ''];
  lines.push('The following MCP servers are configured for this project:\n');

  for (const [key, server] of Object.entries(servers)) {
    lines.push(`### ${key}`);
    if (server.description) lines.push(`> ${server.description}`);
    if (server.type === 'http') lines.push(`- **URL:** \`${server.url}\``);
    if (server.command) lines.push(`- **Command:** \`${server.command} ${(server.args || []).join(' ')}\``);
    lines.push('');
  }

  return lines.join('\n');
}
