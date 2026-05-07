import path from 'path';
import chalk from 'chalk';
import { readGuidelines, readSkills, readLocalConfig, writeLocalConfig, readMcpConfig, writeFile } from './utils/reader.js';
import { buildMcpServers, generateMcpJson, generateJunieMcpJson } from './utils/mcp.js';
import { AGENTS_MD_CONSUMERS, MCP_JSON_CONSUMERS } from './agents.js';
import { generateAgentsMd } from './generators/agents.js';
import { generateClaudeMd } from './generators/claude.js';
import { generateJunieGuidelines } from './generators/junie.js';
import { generateCursorRules, generateCursorRulesLegacy } from './generators/cursor.js';
import { generateKiroSteering } from './generators/kiro.js';

export async function generate(projectDir, options = {}) {
  const aiDir = path.join(projectDir, '.ai');
  const verbose = options.verbose ?? false;

  const log = (msg) => console.log(msg);
  const info = (label, file) => log(`  ${chalk.green('✓')} ${chalk.dim(label.padEnd(30))} ${chalk.cyan(file)}`);
  const skip = (label, reason) => verbose && log(`  ${chalk.yellow('–')} ${chalk.dim(label.padEnd(30))} ${chalk.yellow(reason)}`);

  // Resolve agents — flag (one-off) > local config > inline prompt
  let localConfig = readLocalConfig(projectDir);
  let activeAgentsList;
  let isOneOff = false;

  if (options.agents) {
    activeAgentsList = options.agents.split(',').map(a => a.trim()).filter(Boolean);
    isOneOff = true;
  } else if (localConfig.agents?.length) {
    activeAgentsList = localConfig.agents;
  } else {
    log('');
    log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — first run setup'));
    const { selectAgents } = await import('./init.js');
    activeAgentsList = await selectAgents(projectDir, null);
    localConfig.agents = activeAgentsList;
    writeLocalConfig(projectDir, localConfig);
  }

  const activeAgents = new Set(activeAgentsList);
  const has = (key) => activeAgents.has(key);
  const hasAny = (keys) => keys.some(k => activeAgents.has(k));

  log('');
  log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — generating agent files'));
  log('');

  // Read source files
  const guidelines = await readGuidelines(aiDir);
  const skills = await readSkills(aiDir);
  const mcpServers = buildMcpServers(readMcpConfig(aiDir), localConfig);

  if (guidelines.length === 0 && skills.length === 0) {
    log(chalk.yellow('  ⚠ No guidelines or skills found in .ai/'));
    log(chalk.dim('    Create .ai/guidelines/*.md or .ai/skills/*/SKILL.md to get started'));
    log('');
  } else {
    log(chalk.dim(`  Found ${guidelines.length} guideline(s), ${skills.length} skill(s), ${Object.keys(mcpServers).length} MCP server(s)`));
    log(chalk.dim(`  Agents: ${activeAgentsList.join(', ')}`));
    log('');
  }

  const generatedFiles = [];

  // AGENTS.md — Amp, Codex, Copilot, Gemini, OpenCode
  if (hasAny(AGENTS_MD_CONSUMERS)) {
    const agentsMd = generateAgentsMd(guidelines, skills, mcpServers, {});
    writeFile(path.join(projectDir, 'AGENTS.md'), agentsMd);
    info('AGENTS.md', 'AGENTS.md');
    generatedFiles.push('AGENTS.md');
  } else {
    skip('AGENTS.md', 'no AGENTS.md consumers selected');
  }

  // CLAUDE.md — Claude Code
  if (has('claude_code')) {
    const claudeMd = generateClaudeMd(guidelines, skills, mcpServers, {});
    writeFile(path.join(projectDir, 'CLAUDE.md'), claudeMd);
    info('Claude Code', 'CLAUDE.md');
    generatedFiles.push('CLAUDE.md');
  } else {
    skip('Claude Code', 'not selected');
  }

  // .mcp.json — Claude Code + Codex
  if (hasAny(MCP_JSON_CONSUMERS)) {
    const mcpJson = generateMcpJson(mcpServers);
    writeFile(path.join(projectDir, '.mcp.json'), mcpJson);
    info('MCP (Claude/Codex)', '.mcp.json');
    generatedFiles.push('.mcp.json');
  } else {
    skip('MCP', 'no MCP consumers selected');
  }

  // .junie/ — JetBrains Junie
  if (has('junie')) {
    const junieGuidelines = generateJunieGuidelines(guidelines, skills, {});
    writeFile(path.join(projectDir, '.junie', 'guidelines.md'), junieGuidelines);
    info('Junie guidelines', '.junie/guidelines.md');
    generatedFiles.push('.junie/guidelines.md');

    const junieMcpJson = generateJunieMcpJson(mcpServers);
    writeFile(path.join(projectDir, '.junie', 'mcp.json'), junieMcpJson);
    info('Junie MCP', '.junie/mcp.json');
    generatedFiles.push('.junie/mcp.json');
  } else {
    skip('Junie', 'not selected');
  }

  // Cursor
  if (has('cursor')) {
    const cursorRules = generateCursorRules(guidelines, skills, {});
    writeFile(path.join(projectDir, '.cursor', 'rules', 'js-boost.mdc'), cursorRules);
    info('Cursor (modern)', '.cursor/rules/js-boost.mdc');
    generatedFiles.push('.cursor/rules/js-boost.mdc');

    const cursorLegacy = generateCursorRulesLegacy(guidelines, skills, {});
    writeFile(path.join(projectDir, '.cursorrules'), cursorLegacy);
    info('Cursor (legacy)', '.cursorrules');
    generatedFiles.push('.cursorrules');
  } else {
    skip('Cursor', 'not selected');
  }

  // Kiro
  if (has('kiro')) {
    const kiroSteering = generateKiroSteering(guidelines, skills, {});
    writeFile(path.join(projectDir, '.kiro', 'steering', 'guidelines.md'), kiroSteering);
    info('Kiro', '.kiro/steering/guidelines.md');
    generatedFiles.push('.kiro/steering/guidelines.md');
  } else {
    skip('Kiro', 'not selected');
  }

  log('');
  log(chalk.green.bold(`  ✓ Generated ${generatedFiles.length} files successfully`));
  log('');

  // Write state back to local config (skip for one-off --agents flag)
  if (!isOneOff) {
    localConfig.guidelines = true;
    localConfig.skills = skills.map(s => s.name);
    writeLocalConfig(projectDir, localConfig);
  }

  return generatedFiles;
}
