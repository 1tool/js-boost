/**
 * Default MCP servers pre-configured for js-boost
 */
export const DEFAULT_MCP_SERVERS = {
};

/**
 * Build the MCP servers object, merging defaults with user-defined servers
 * from js-boost.config.json
 */
export function buildMcpServers(config = {}) {
  const userServers = config.mcpServers || {};
  const disabledDefaults = config.disableMcpServers || [];

  const servers = {};

  // Add default servers (unless disabled)
  for (const [key, server] of Object.entries(DEFAULT_MCP_SERVERS)) {
    if (!disabledDefaults.includes(key)) {
      servers[key] = server;
    }
  }

  // Merge user-defined servers (can override defaults)
  for (const [key, server] of Object.entries(userServers)) {
    servers[key] = server;
  }

  return servers;
}

/**
 * Generate .mcp.json (used by Claude Code and Codex)
 * Supports both stdio and remote (HTTP/SSE) server types
 */
export function generateMcpJson(servers) {
  const mcpServers = {};

  for (const [key, server] of Object.entries(servers)) {
    if (server.type === 'stdio') {
      mcpServers[key] = {
        command: server.command,
        args: server.args || [],
        ...(server.env ? { env: server.env } : {})
      };
    } else if (server.type === 'remote') {
      // Claude Code uses mcp-remote wrapper for HTTP/SSE servers
      mcpServers[key] = {
        command: 'npx',
        args: ['-y', 'mcp-remote', server.url]
      };
    }
  }

  return JSON.stringify({ mcpServers }, null, 2);
}

/**
 * Generate .junie/mcp.json (Junie format — supports URL directly)
 */
export function generateJunieMcpJson(servers) {
  const mcpServers = {};

  for (const [key, server] of Object.entries(servers)) {
    if (server.type === 'stdio') {
      mcpServers[key] = {
        command: server.command,
        args: server.args || [],
        ...(server.env ? { env: server.env } : {})
      };
    } else if (server.type === 'remote') {
      mcpServers[key] = {
        url: server.url
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
    if (server.type === 'remote') lines.push(`- **URL:** \`${server.url}\``);
    if (server.type === 'stdio') lines.push(`- **Command:** \`${server.command} ${(server.args || []).join(' ')}\``);
    lines.push('');
  }

  return lines.join('\n');
}
