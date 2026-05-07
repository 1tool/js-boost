import path from 'path';
import chalk from 'chalk';
import { text, select, multiselect, isCancel } from '@clack/prompts';
import { DEFAULT_MCP_SERVERS } from '../utils/mcp.js';
import { readMcpConfig, writeMcpConfig, readLocalConfig, writeLocalConfig } from '../utils/reader.js';

function displayServers(mcpConfig, localConfig) {
  const userServers = mcpConfig.mcpServers || {};
  const disabled = new Set(localConfig.disabledMcpServers || []);
  const builtinKeys = Object.keys(DEFAULT_MCP_SERVERS);

  if (builtinKeys.length > 0) {
    console.log(chalk.bold('  Built-in'));
    for (const key of builtinKeys) {
      const srv = DEFAULT_MCP_SERVERS[key];
      const status = disabled.has(key) ? chalk.dim('disabled') : chalk.green('enabled');
      console.log(`    ${chalk.cyan(key.padEnd(18))} ${chalk.dim(srv.url)}  [${status}]`);
    }
    console.log('');
  }

  console.log(chalk.bold('  Custom') + chalk.dim('  →  .ai/mcp/mcp.json'));
  const userEntries = Object.entries(userServers);
  if (userEntries.length === 0) {
    console.log(chalk.dim('    (none)'));
  } else {
    for (const [key, srv] of userEntries) {
      const addr = srv.type === 'http'
        ? srv.url
        : `${srv.command}${srv.args?.length ? ' ' + srv.args.join(' ') : ''}`;
      const type = srv.type === 'http' ? 'remote' : 'stdio';
      console.log(`    ${chalk.cyan(key.padEnd(18))} ${chalk.dim(addr)}  ${chalk.dim(`(${type})`)}`);
    }
  }
  console.log('');
}

async function addServer(mcpConfig) {
  const name = await text({
    message: 'Server key',
    placeholder: 'my-api',
    validate: (v) => {
      if (!v.trim()) return 'Key is required';
      if ((mcpConfig.mcpServers || {})[v.trim()]) return `"${v.trim()}" already exists`;
      if (DEFAULT_MCP_SERVERS[v.trim()]) return `"${v.trim()}" is a built-in — use "Toggle built-ins" to enable/disable it`;
      if (!/^[a-z0-9_-]+$/.test(v.trim())) return 'Use only lowercase letters, numbers, hyphens, underscores';
    },
  });
  if (isCancel(name)) return;

  const type = await select({
    message: 'Server type',
    options: [
      { value: 'http',  label: 'Remote', hint: 'HTTP / SSE url' },
      { value: 'stdio', label: 'Local',  hint: 'stdio process (node, python, etc.)' },
    ],
  });
  if (isCancel(type)) return;

  const key = name.trim();

  if (type === 'http') {
    const url = await text({
      message: 'URL',
      placeholder: 'https://my-mcp.com/mcp',
      validate: (v) => v.trim() ? undefined : 'URL is required',
    });
    if (isCancel(url)) return;

    const headersRaw = await text({
      message: 'Headers (Key: Value, comma-separated, optional)',
      placeholder: 'Authorization: Bearer TOKEN',
    });
    if (isCancel(headersRaw)) return;

    const description = await text({
      message: 'Description (optional)',
      placeholder: 'What does this server provide?',
    });
    if (isCancel(description)) return;

    const headers = {};
    if (headersRaw.trim()) {
      for (const pair of headersRaw.trim().split(',')) {
        const colon = pair.indexOf(':');
        if (colon > 0) {
          const k = pair.slice(0, colon).trim();
          const v = pair.slice(colon + 1).trim();
          if (k) headers[k] = v;
        }
      }
    }

    mcpConfig.mcpServers[key] = {
      type: 'http',
      url: url.trim(),
      ...(Object.keys(headers).length ? { headers } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    };
  } else {
    const command = await text({
      message: 'Command',
      placeholder: 'node',
      validate: (v) => v.trim() ? undefined : 'Command is required',
    });
    if (isCancel(command)) return;

    const argsRaw = await text({
      message: 'Arguments (space-separated, optional)',
      placeholder: './mcp-server.js --port 3000',
    });
    if (isCancel(argsRaw)) return;

    const envRaw = await text({
      message: 'Environment variables (KEY=VALUE, comma-separated, optional)',
      placeholder: 'API_KEY=secret,NODE_ENV=production',
    });
    if (isCancel(envRaw)) return;

    const args = argsRaw.trim() ? argsRaw.trim().split(/\s+/) : [];

    const env = {};
    if (envRaw.trim()) {
      for (const pair of envRaw.trim().split(',')) {
        const eq = pair.indexOf('=');
        if (eq > 0) {
          const k = pair.slice(0, eq).trim();
          const v = pair.slice(eq + 1).trim();
          if (k) env[k] = v;
        }
      }
    }

    mcpConfig.mcpServers[key] = {
      command: command.trim(),
      ...(args.length ? { args } : {}),
      ...(Object.keys(env).length ? { env } : {}),
    };
  }

  console.log(`  ${chalk.green('✓')} Added ${chalk.cyan(key)} → ${chalk.dim('.ai/mcp/mcp.json')}`);
}

async function removeServer(mcpConfig) {
  const keys = Object.keys(mcpConfig.mcpServers);
  if (keys.length === 0) {
    console.log(chalk.dim('  No custom servers to remove.'));
    return;
  }

  const toRemove = await multiselect({
    message: 'Select servers to remove',
    options: keys.map((k) => {
      const srv = mcpConfig.mcpServers[k];
      const addr = srv.type === 'http'
        ? srv.url
        : `${srv.command}${srv.args?.length ? ' ' + srv.args.join(' ') : ''}`;
      return { value: k, label: k, hint: addr };
    }),
    required: false,
  });
  if (isCancel(toRemove)) return;

  for (const k of toRemove) delete mcpConfig.mcpServers[k];

  if (toRemove.length) {
    console.log(`  ${chalk.green('✓')} Removed: ${toRemove.map(k => chalk.cyan(k)).join(', ')}`);
  }
}

async function toggleDefaults(localConfig) {
  const keys = Object.keys(DEFAULT_MCP_SERVERS);
  if (keys.length === 0) {
    console.log(chalk.dim('  No built-in servers configured.'));
    return;
  }

  const disabled = new Set(localConfig.disabledMcpServers || []);

  const enabled = await multiselect({
    message: 'Which built-in servers should be enabled?',
    options: keys.map((k) => ({
      value: k,
      label: k,
      hint: DEFAULT_MCP_SERVERS[k].url,
    })),
    initialValues: keys.filter((k) => !disabled.has(k)),
    required: false,
  });
  if (isCancel(enabled)) return;

  const enabledSet = new Set(enabled);
  localConfig.disabledMcpServers = keys.filter((k) => !enabledSet.has(k));
  console.log(`  ${chalk.green('✓')} Updated → ${chalk.dim('.js-boost.json')}`);
}

export async function configureMcp(projectDir) {
  const aiDir = path.join(projectDir, '.ai');
  const mcpConfig = readMcpConfig(aiDir);
  const localConfig = readLocalConfig(projectDir);
  localConfig.disabledMcpServers = localConfig.disabledMcpServers || [];

  console.log('');
  console.log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — MCP server configuration'));
  console.log('');

  let running = true;

  while (running) {
    displayServers(mcpConfig, localConfig);

    const hasCustom = Object.keys(mcpConfig.mcpServers).length > 0;
    const hasBuiltins = Object.keys(DEFAULT_MCP_SERVERS).length > 0;

    const options = [
      { value: 'add', label: 'Add a server' },
      ...(hasCustom   ? [{ value: 'remove', label: 'Remove a server' }] : []),
      ...(hasBuiltins ? [{ value: 'toggle', label: 'Disable / enable built-in servers' }] : []),
      { value: 'done', label: 'Save and exit' },
    ];

    const action = await select({ message: 'What would you like to do?', options });

    if (isCancel(action) || action === 'done') {
      running = false;
      break;
    }

    console.log('');
    if (action === 'add')    await addServer(mcpConfig);
    if (action === 'remove') await removeServer(mcpConfig);
    if (action === 'toggle') await toggleDefaults(localConfig);
    console.log('');
  }

  writeMcpConfig(aiDir, mcpConfig);
  writeLocalConfig(projectDir, localConfig);
  console.log('');
  console.log(chalk.green('  ✓ Saved'));
  console.log(chalk.dim('    team config  →  .ai/mcp/mcp.json'));
  console.log(chalk.dim('    local config →  .js-boost.json'));
  console.log(chalk.dim('  Run `npx @1tool/js-boost generate` to apply changes.'));
  console.log('');
}
