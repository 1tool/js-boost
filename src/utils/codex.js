import fs from 'fs';
import path from 'path';

function escapeTomlString(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');
}

function formatTomlString(value) {
  return `"${escapeTomlString(value)}"`;
}

function formatTomlArray(values) {
  return `[${values.map(formatTomlString).join(', ')}]`;
}

function formatTomlInlineTable(entries) {
  const pairs = Object.entries(entries).map(([key, value]) => `${formatBareOrQuotedKey(key)} = ${formatTomlString(value)}`);
  return `{ ${pairs.join(', ')} }`;
}

function formatBareOrQuotedKey(key) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : formatTomlString(key);
}

function buildServerBlock(name, server) {
  const lines = [`[mcp_servers.${formatBareOrQuotedKey(name)}]`];

  if (server.type === 'http') {
    lines.push(`url = ${formatTomlString(server.url)}`);
    if (server.headers && Object.keys(server.headers).length > 0) {
      lines.push(`http_headers = ${formatTomlInlineTable(server.headers)}`);
    }
  } else if (server.command) {
    lines.push(`command = ${formatTomlString(server.command)}`);
    if (server.args?.length) {
      lines.push(`args = ${formatTomlArray(server.args)}`);
    }
  }

  if (server.env && Object.keys(server.env).length > 0) {
    lines.push('');
    lines.push(`[mcp_servers.${formatBareOrQuotedKey(name)}.env]`);
    for (const [key, value] of Object.entries(server.env)) {
      lines.push(`${formatBareOrQuotedKey(key)} = ${formatTomlString(value)}`);
    }
  }

  return `${lines.join('\n')}\n`;
}

function findServerBlocks(content, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const headerPattern = new RegExp(`^\\[mcp_servers\\.${escapedName}(?:\\.env)?\\]\\s*$`, 'gm');
  const matches = [];
  let match;

  while ((match = headerPattern.exec(content)) !== null) {
    matches.push(match.index);
  }

  if (matches.length === 0) {
    return null;
  }

  let start = matches[0];
  while (start > 0 && content[start - 1] === '\n') {
    start -= 1;
  }

  const nextHeaderPattern = /^\[[^\n]+\]\s*$/gm;
  nextHeaderPattern.lastIndex = matches[matches.length - 1] + 1;

  let end = content.length;
  let nextMatch;
  while ((nextMatch = nextHeaderPattern.exec(content)) !== null) {
    if (nextMatch.index <= matches[matches.length - 1]) continue;
    end = nextMatch.index;
    break;
  }

  while (end > start && content[end - 1] === '\n') {
    end -= 1;
  }

  return { start, end };
}

export function generateCodexToml(servers = {}, existingContent = '') {
  let content = existingContent.replace(/\r\n/g, '\n');
  const entries = Object.entries(servers);

  for (const [name, server] of entries) {
    const block = buildServerBlock(name, server);
    const range = findServerBlocks(content, name);

    if (range) {
      const before = content.slice(0, range.start).trimEnd();
      const after = content.slice(range.end).trimStart();
      content = [before, block.trimEnd(), after].filter(Boolean).join('\n\n');
    } else {
      const trimmed = content.trimEnd();
      content = trimmed ? `${trimmed}\n\n${block}` : block;
    }
  }

  return `${content.trimEnd()}\n`;
}

export function writeCodexConfig(projectDir, servers = {}) {
  const configPath = path.join(projectDir, '.codex', 'config.toml');
  const existingContent = fs.existsSync(configPath) ? fs.readFileSync(configPath, 'utf8') : '';
  const content = generateCodexToml(servers, existingContent);
  return { configPath, content };
}
