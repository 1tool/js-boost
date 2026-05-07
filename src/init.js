import path from 'path';
import fs from 'fs';
import chalk from 'chalk';
import { multiselect, isCancel, cancel } from '@clack/prompts';
import { writeFile } from './utils/reader.js';
import { AGENTS } from './agents.js';
import { detectInstalledAgents } from './utils/detect.js';

const EXAMPLE_GUIDELINES = {
  'general.md': `# General Guidelines

## Code Style
- TODO: describe your preferred language, style, and formatting conventions

## Project Conventions
- TODO: describe your folder structure and naming conventions

## Git
- TODO: describe your branching and commit message conventions
`,

  'testing.md': `# Testing Guidelines

## Conventions
- TODO: describe your test framework and file naming conventions
- TODO: describe what should and should not be mocked
`,
};

const EXAMPLE_SKILL = {
  'SKILL.md': `---
name: example-skill
description: TODO: describe when the agent should use this skill.
---

# Example Skill

TODO: describe the steps, patterns, or conventions the agent should follow.
`
};

export async function selectAgents(projectDir, currentAgents = null) {
  const detected = detectInstalledAgents(projectDir);

  const options = Object.values(AGENTS).map(agent => ({
    value: agent.key,
    label: agent.name,
    hint: agent.hint,
  }));

  const defaults = currentAgents
    ? currentAgents
    : detected.length > 0
      ? detected
      : Object.keys(AGENTS);

  console.log('');
  const selected = await multiselect({
    message: 'Which AI agents would you like to configure?',
    options,
    initialValues: defaults,
    required: true,
  });

  if (isCancel(selected)) {
    cancel('Operation cancelled.');
    process.exit(0);
  }

  return selected;
}

export async function init(projectDir, options = {}) {
  const aiDir = path.join(projectDir, '.ai');
  const force = options.force ?? false;

  console.log('');
  console.log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — initializing .ai/ folder'));
  console.log('');

  if (fs.existsSync(aiDir) && !force) {
    console.log(chalk.yellow('  ⚠ .ai/ folder already exists. Use --force to overwrite.'));
    console.log('');
    return;
  }

  // Create .ai/guidelines/ with example files
  for (const [filename, content] of Object.entries(EXAMPLE_GUIDELINES)) {
    const filePath = path.join(aiDir, 'guidelines', filename);
    if (!fs.existsSync(filePath) || force) {
      writeFile(filePath, content);
      console.log(`  ${chalk.green('✓')} ${chalk.cyan(`.ai/guidelines/${filename}`)}`);
    }
  }

  // Create .ai/skills/example-skill/ placeholder
  for (const [filename, content] of Object.entries(EXAMPLE_SKILL)) {
    const filePath = path.join(aiDir, 'skills', 'example-skill', filename);
    if (!fs.existsSync(filePath) || force) {
      writeFile(filePath, content);
      console.log(`  ${chalk.green('✓')} ${chalk.cyan(`.ai/skills/example-skill/${filename}`)}`);
    }
  }

  // Create js-boost.config.json with defaults (or read existing)
  const configPath = path.join(projectDir, 'js-boost.config.json');
  let existingConfig = {};
  if (fs.existsSync(configPath) && !force) {
    try { existingConfig = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch {}
  }

  // Agent selection
  const selectedAgents = await selectAgents(projectDir, existingConfig.agents);

  const config = {
    projectName: existingConfig.projectName || path.basename(projectDir),
    projectDescription: existingConfig.projectDescription || '',
    agents: selectedAgents,
    mcpServers: existingConfig.mcpServers || {},
    disableMcpServers: existingConfig.disableMcpServers || [],
  };

  writeFile(configPath, JSON.stringify(config, null, 2));
  console.log(`  ${chalk.green('✓')} ${chalk.cyan('js-boost.config.json')}`);

  console.log('');
  console.log(chalk.green.bold('  ✓ .ai/ folder initialized'));
  console.log('');
  console.log(chalk.dim('  Next steps:'));
  console.log(chalk.dim('  1. Edit .ai/guidelines/*.md with your project conventions'));
  console.log(chalk.dim('  2. Add skills in .ai/skills/<name>/SKILL.md'));
  console.log(chalk.dim('  3. Run: npx js-boost generate'));
  console.log('');
}
