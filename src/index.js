import path from 'path';
import chalk from 'chalk';
import { readGuidelines, readSkills, readConfig, readMcpConfig, writeFile } from './utils/reader.js';
import { buildMcpServers, generateMcpJson, generateJunieMcpJson } from './utils/mcp.js';
import { AGENTS_MD_CONSUMERS, MCP_JSON_CONSUMERS } from './agents.js';
import { generateAgentsMd } from './generators/agents.js';
import { generateClaudeMd } from './generators/claude.js';
import { generateJunieGuidelines } from './generators/junie.js';
import { generateCursorRules, generateCursorRulesLegacy } from './generators/cursor.js';
import { generateKiroSteering } from './generators/kiro.js';

export async function generate(projectDir, options = {}) {
  const aiDir = path.join(projectDir, '.ai');
  const config = readConfig(projectDir);
  const verbose = options.verbose ?? false;

  // Determine active agents — fall back to all agents if none configured
  const activeAgents = new Set(config.agents ?? Object.keys(
    { amp: 1, claude_code: 1, codex: 1, copilot: 1, cursor: 1, gemini: 1, junie: 1, kiro: 1, opencode: 1 }
  ));

  const has = (key) => activeAgents.has(key);
  const hasAny = (keys) => keys.some(k => activeAgents.has(k));

  const log = (msg) => console.log(msg);
  const info = (label, file) => log(`  ${chalk.green('✓')} ${chalk.dim(label.padEnd(30))} ${chalk.cyan(file)}`);
  const skip = (label, reason) => verbose && log(`  ${chalk.yellow('–')} ${chalk.dim(label.padEnd(30))} ${chalk.yellow(reason)}`);

  log('');
  log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — generating agent files'));
  log('');

  // 1. Read source files
  const guidelines = await readGuidelines(aiDir);
  const skills = await readSkills(aiDir);
  const mcpServers = buildMcpServers(readMcpConfig(aiDir));

  if (guidelines.length === 0 && skills.length === 0) {
    log(chalk.yellow('  ⚠ No guidelines or skills found in .ai/'));
    log(chalk.dim('    Create .ai/guidelines/*.md or .ai/skills/*/SKILL.md to get started'));
    log('');
  } else {
    log(chalk.dim(`  Found ${guidelines.length} guideline(s), ${skills.length} skill(s), ${Object.keys(mcpServers).length} MCP server(s)`));
    log(chalk.dim(`  Agents: ${[...activeAgents].join(', ')}`));
    log('');
  }

  const generatedFiles = [];

  // 2. AGENTS.md — shared format for Codex, Copilot, Gemini, Amp, OpenCode
  if (hasAny(AGENTS_MD_CONSUMERS)) {
    const agentsMd = generateAgentsMd(guidelines, skills, mcpServers, config);
    writeFile(path.join(projectDir, 'AGENTS.md'), agentsMd);
    info('AGENTS.md', 'AGENTS.md');
    generatedFiles.push('AGENTS.md');
  } else {
    skip('AGENTS.md', 'no AGENTS.md consumers selected');
  }

  // 3. CLAUDE.md — Claude Code
  if (has('claude_code')) {
    const claudeMd = generateClaudeMd(guidelines, skills, mcpServers, config);
    writeFile(path.join(projectDir, 'CLAUDE.md'), claudeMd);
    info('Claude Code', 'CLAUDE.md');
    generatedFiles.push('CLAUDE.md');
  } else {
    skip('Claude Code', 'not selected');
  }

  // 4. .mcp.json — Claude Code + Codex
  if (hasAny(MCP_JSON_CONSUMERS)) {
    const mcpJson = generateMcpJson(mcpServers);
    writeFile(path.join(projectDir, '.mcp.json'), mcpJson);
    info('MCP (Claude/Codex)', '.mcp.json');
    generatedFiles.push('.mcp.json');
  } else {
    skip('MCP', 'no MCP consumers selected');
  }

  // 5. .junie/ — JetBrains Junie
  if (has('junie')) {
    const junieGuidelines = generateJunieGuidelines(guidelines, skills, config);
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

  // 6. Cursor — .cursor/rules/ + legacy .cursorrules
  if (has('cursor')) {
    const cursorRules = generateCursorRules(guidelines, skills, config);
    writeFile(path.join(projectDir, '.cursor', 'rules', 'js-boost.mdc'), cursorRules);
    info('Cursor (modern)', '.cursor/rules/js-boost.mdc');
    generatedFiles.push('.cursor/rules/js-boost.mdc');

    const cursorLegacy = generateCursorRulesLegacy(guidelines, skills, config);
    writeFile(path.join(projectDir, '.cursorrules'), cursorLegacy);
    info('Cursor (legacy)', '.cursorrules');
    generatedFiles.push('.cursorrules');
  } else {
    skip('Cursor', 'not selected');
  }

  // 7. Kiro — .kiro/steering/guidelines.md
  if (has('kiro')) {
    const kiroSteering = generateKiroSteering(guidelines, skills, config);
    writeFile(path.join(projectDir, '.kiro', 'steering', 'guidelines.md'), kiroSteering);
    info('Kiro', '.kiro/steering/guidelines.md');
    generatedFiles.push('.kiro/steering/guidelines.md');
  } else {
    skip('Kiro', 'not selected');
  }

  log('');
  log(chalk.green.bold(`  ✓ Generated ${generatedFiles.length} files successfully`));
  log('');

  return generatedFiles;
}