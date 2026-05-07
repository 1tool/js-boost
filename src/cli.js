import { program } from 'commander';
import path from 'path';
import chalk from 'chalk';
import { generate } from './index.js';
import { init, selectAgents } from './init.js';
import { watch } from './watch.js';

program
  .name('js-boost')
  .description('Generate agent files (AGENTS.md, CLAUDE.md, .mcp.json, Junie, Cursor) from your .ai/ folder')
  .version('1.0.0');

// ─── js-boost init ───────────────────────────────────────────────────────────
program
  .command('init')
  .description('Scaffold the .ai/ folder with example guidelines and skills')
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
  .description('Generate all agent files from .ai/guidelines/ and .ai/skills/')
  .option('--dir <path>', 'Project directory', process.cwd())
  .option('--verbose', 'Show skipped files')
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    try {
      await generate(projectDir, { verbose: options.verbose });
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
  .description('Select which AI agents to configure (updates js-boost.config.json)')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    const { readConfig, writeFile } = await import('./utils/reader.js');
    const configPath = `${projectDir}/js-boost.config.json`;
    const config = readConfig(projectDir);

    const selected = await selectAgents(projectDir, config.agents ?? null);
    config.agents = selected;

    writeFile(configPath, JSON.stringify(config, null, 2));
    console.log('');
    console.log(chalk.green('  ✓ Agent configuration saved to js-boost.config.json'));
    console.log('');
    console.log(chalk.dim(`  Selected: ${selected.join(', ')}`));
    console.log('');
  });

// ─── js-boost mcp ────────────────────────────────────────────────────────────
program
  .command('mcp')
  .description('Configure MCP servers — add, remove, or toggle built-in defaults')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    const { configureMcp } = await import('./configure/mcp.js');
    await configureMcp(projectDir);
  });

// ─── js-boost status ─────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show what .ai/ contains and what would be generated')
  .option('--dir <path>', 'Project directory', process.cwd())
  .action(async (options) => {
    const projectDir = path.resolve(options.dir);
    const { readGuidelines, readSkills, readConfig, readMcpConfig } = await import('./utils/reader.js');
    const { buildMcpServers } = await import('./utils/mcp.js');
    const { AGENTS, AGENTS_MD_CONSUMERS, MCP_JSON_CONSUMERS } = await import('./agents.js');
    const aiDir = path.join(projectDir, '.ai');
    const config = readConfig(projectDir);

    const guidelines = await readGuidelines(aiDir);
    const skills = await readSkills(aiDir);
    const mcpServers = buildMcpServers(readMcpConfig(aiDir));

    const allAgentKeys = Object.keys(AGENTS);
    const activeAgents = new Set(config.agents ?? allAgentKeys);
    const has = (key) => activeAgents.has(key);
    const hasAny = (keys) => keys.some(k => activeAgents.has(k));

    console.log('');
    console.log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — status'));
    console.log('');

    // Agents
    console.log(chalk.bold('  Agents') + chalk.dim(` (${activeAgents.size} of ${allAgentKeys.length} selected)`));
    for (const [key, agent] of Object.entries(AGENTS)) {
      const active = activeAgents.has(key);
      const icon = active ? chalk.green('✓') : chalk.dim('–');
      const label = active ? chalk.cyan(agent.name) : chalk.dim(agent.name);
      const hint = chalk.dim(`(${agent.hint})`);
      console.log(`    ${icon} ${label} ${hint}`);
    }
    if (config.agents == null) console.log(chalk.dim('    (all agents — run `js-boost agents` to configure)'));
    console.log('');

    console.log(chalk.bold('  Guidelines') + chalk.dim(` (${guidelines.length})`));
    for (const g of guidelines) {
      console.log(`    ${chalk.green('•')} ${chalk.cyan(g.filename)} — ${chalk.dim(g.title)}`);
    }
    if (guidelines.length === 0) console.log(chalk.dim('    none — add .ai/guidelines/*.md'));
    console.log('');

    console.log(chalk.bold('  Skills') + chalk.dim(` (${skills.length})`));
    for (const s of skills) {
      console.log(`    ${chalk.green('•')} ${chalk.cyan(s.name)} — ${chalk.dim(s.description || s.dir)}`);
    }
    if (skills.length === 0) console.log(chalk.dim('    none — add .ai/skills/<name>/SKILL.md'));
    console.log('');

    console.log(chalk.bold('  MCP Servers') + chalk.dim(` (${Object.keys(mcpServers).length})`));
    for (const [key, srv] of Object.entries(mcpServers)) {
      const url = srv.url || `${srv.command} ${(srv.args || []).join(' ')}`;
      console.log(`    ${chalk.green('•')} ${chalk.cyan(key)} — ${chalk.dim(url)}`);
    }
    console.log('');

    console.log(chalk.bold('  Will generate:'));
    const willGenerate = [
      hasAny(AGENTS_MD_CONSUMERS) && ['AGENTS.md', 'Amp, Codex, Copilot, Gemini, OpenCode'],
      has('claude_code')          && ['CLAUDE.md', 'Claude Code'],
      hasAny(MCP_JSON_CONSUMERS)  && ['.mcp.json', 'Claude Code + Codex MCP'],
      has('junie')                && ['.junie/guidelines.md + .junie/mcp.json', 'JetBrains Junie'],
      has('cursor')               && ['.cursor/rules/js-boost.mdc + .cursorrules', 'Cursor'],
      has('kiro')                 && ['.kiro/steering/guidelines.md', 'Kiro'],
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
