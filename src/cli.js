import { program } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { generate } from './index.js';
import { init, selectAgents } from './init.js';
import { watch } from './watch.js';

program
  .name('js-boost')
  .description('Generate agent files from your .ai/ folder')
  .version('1.2.0');

// ─── js-boost init ───────────────────────────────────────────────────────────
program
  .command('init')
  .description('Scaffold .ai/ folder, select agents, create .js-boost.json')
  .option('--force', 'Overwrite existing files')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    await init(projectDir, { force: options.force });
  });

// ─── js-boost generate ───────────────────────────────────────────────────────
program
  .command('generate')
  .alias('gen')
  .description('Generate agent files from .ai/guidelines/ and .ai/skills/')
  .option('--dir <path>', 'Project directory', process.cwd())
  .option('--agents <list>', 'Comma-separated agent keys — one-off override, not saved (e.g. claude_code,cursor)')
  .option('--verbose', 'Show skipped files')
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    try {
      await generate(projectDir, { verbose: options.verbose, agents: options.agents });
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
      process.exit(1);
    }
  });

// ─── js-boost watch ──────────────────────────────────────────────────────────
program
  .command('watch')
  .description('Watch .ai/ for changes and regenerate automatically')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action((options) => {
    const projectDir = path.resolve(options.dir);
    watch(projectDir);
  });

// ─── js-boost agents ─────────────────────────────────────────────────────────
program
  .command('agents')
  .description('Re-select AI agents and update .js-boost.json')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    const { readLocalConfig, writeLocalConfig } = await import('./utils/reader.js');
    const localConfig = readLocalConfig(projectDir);

    const selected = await selectAgents(projectDir, localConfig.agents ?? null);
    writeLocalConfig(projectDir, { ...localConfig, agents: selected });

    console.log('');
    console.log(chalk.green('  ✓ Saved to .js-boost.json'));
    console.log(chalk.dim(`  Agents: ${selected.join(', ')}`));
    console.log('');
  });

// ─── js-boost mcp ────────────────────────────────────────────────────────────
program
  .command('mcp')
  .description('Configure MCP servers — add/remove team servers or toggle built-in defaults')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    const { configureMcp } = await import('./configure/mcp.js');
    await configureMcp(projectDir);
  });

// ─── js-boost status ─────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show configured agents, guidelines, skills, MCP servers, and output files')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    const { readGuidelines, readSkills, readLocalConfig, readMcpConfig } = await import('./utils/reader.js');
    const { buildMcpServers } = await import('./utils/mcp.js');
    const { AGENTS, AGENTS_MD_CONSUMERS, MCP_JSON_CONSUMERS } = await import('./agents.js');
    const aiDir = path.join(projectDir, '.ai');

    const localConfig = readLocalConfig(projectDir);
    const guidelines = await readGuidelines(aiDir);
    const skills = await readSkills(aiDir);
    const mcpServers = buildMcpServers(readMcpConfig(aiDir), localConfig);

    const allAgentKeys = Object.keys(AGENTS);
    const activeAgents = new Set(localConfig.agents ?? allAgentKeys);
    const has = (key) => activeAgents.has(key);
    const hasAny = (keys) => keys.some(k => activeAgents.has(k));
    const hasNonClaudeAgent = [...activeAgents].some((key) => key !== 'claude_code');

    console.log('');
    console.log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — status'));
    console.log('');

    // Agents
    console.log(chalk.bold('  Agents') + chalk.dim(` (${activeAgents.size} of ${allAgentKeys.length} selected)`));
    for (const [key, agent] of Object.entries(AGENTS)) {
      const active = activeAgents.has(key);
      const icon = active ? chalk.green('✓') : chalk.dim('–');
      const label = active ? chalk.cyan(agent.name) : chalk.dim(agent.name);
      console.log(`    ${icon} ${label} ${chalk.dim(`(${agent.hint})`)}`);
    }
    if (!localConfig.agents) console.log(chalk.dim('    (none configured — run `js-boost init` or `js-boost agents`)'));
    console.log('');

    // Guidelines
    console.log(chalk.bold('  Guidelines') + chalk.dim(` (${guidelines.length})`));
    for (const g of guidelines) {
      console.log(`    ${chalk.green('•')} ${chalk.cyan(g.filename)} — ${chalk.dim(g.title)}`);
    }
    if (guidelines.length === 0) console.log(chalk.dim('    none — add .ai/guidelines/*.md'));
    console.log('');

    // Skills
    console.log(chalk.bold('  Skills') + chalk.dim(` (${skills.length})`));
    for (const s of skills) {
      console.log(`    ${chalk.green('•')} ${chalk.cyan(s.name)} — ${chalk.dim(s.description || s.dir)}`);
    }
    if (skills.length === 0) console.log(chalk.dim('    none — add .ai/skills/<name>/SKILL.md'));
    console.log('');

    // MCP servers
    console.log(chalk.bold('  MCP Servers') + chalk.dim(` (${Object.keys(mcpServers).length})`));
    for (const [key, srv] of Object.entries(mcpServers)) {
      const addr = srv.type === 'http' ? srv.url : `${srv.command} ${(srv.args || []).join(' ')}`;
      console.log(`    ${chalk.green('•')} ${chalk.cyan(key)} — ${chalk.dim(addr)}`);
    }
    if (Object.keys(mcpServers).length === 0) console.log(chalk.dim('    none — run `js-boost mcp` to configure'));
    console.log('');

    // Will generate
    console.log(chalk.bold('  Will generate:'));
    const willGenerate = [
      has('claude_code') && skills.length > 0 && ['.claude/skills/',                     'Claude Code skill registry'],
      hasNonClaudeAgent && skills.length > 0 && ['.agents/skills/',                     'Shared skill registry for non-Claude agents'],
      hasAny(AGENTS_MD_CONSUMERS) && ['AGENTS.md',                              'Amp, Codex, Copilot, Gemini, OpenCode'],
      has('claude_code')          && ['CLAUDE.md',                              'Claude Code'],
      hasAny(MCP_JSON_CONSUMERS)  && ['.mcp.json',                              'Claude Code'],
      has('codex') && Object.keys(mcpServers).length > 0 && ['.codex/config.toml',                    'Codex MCP registration'],
      has('junie')                && ['.junie/guidelines.md + .junie/mcp.json', 'JetBrains Junie'],
      has('cursor')               && ['.cursor/rules/js-boost.mdc + .cursorrules', 'Cursor'],
      has('kiro')                 && ['.kiro/steering/guidelines.md',           'Kiro'],
    ].filter(Boolean);

    for (const [file, label] of willGenerate) {
      console.log(`    ${chalk.green('•')} ${chalk.cyan(file.padEnd(42))} ${chalk.dim(label)}`);
    }
    if (willGenerate.length === 0) {
      console.log(chalk.dim('    none — run `js-boost agents` to select agents'));
    }
    console.log('');
  });

program.parse();
