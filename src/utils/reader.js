import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

/**
 * Read all markdown files from .ai/guidelines/
 * Returns array of { filename, title, content }
 */
export async function readGuidelines(aiDir) {
  const guidelinesDir = path.join(aiDir, 'guidelines');
  if (!fs.existsSync(guidelinesDir)) return [];

  const files = await glob('**/*.md', { cwd: guidelinesDir, absolute: false });
  files.sort();

  return files.map(file => {
    const fullPath = path.join(guidelinesDir, file);
    const content = fs.readFileSync(fullPath, 'utf8').trim();
    const firstLine = content.split('\n')[0];
    const title = firstLine.startsWith('#')
      ? firstLine.replace(/^#+\s*/, '').trim()
      : path.basename(file, '.md');
    return { filename: file, title, content };
  });
}

/**
 * Read all skills from .ai/skills/
 * Each skill is a folder containing SKILL.md with YAML frontmatter
 * Returns array of { name, description, dir, content }
 */
export async function readSkills(aiDir) {
  const skillsDir = path.join(aiDir, 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const skillFiles = await glob('*/SKILL.md', { cwd: skillsDir, absolute: false });
  skillFiles.sort();

  return skillFiles.map(file => {
    const fullPath = path.join(skillsDir, file);
    const content = fs.readFileSync(fullPath, 'utf8').trim();
    const dir = path.dirname(file);

    let name = dir;
    let description = '';
    const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (fmMatch) {
      const fm = fmMatch[1];
      const nameMatch = fm.match(/^name:\s*(.+)$/m);
      const descMatch = fm.match(/^description:\s*(.+)$/m);
      if (nameMatch) name = nameMatch[1].trim();
      if (descMatch) description = descMatch[1].trim();
    } else {
      const headingMatch = content.match(/^#+\s*(.+)$/m);
      if (headingMatch) name = headingMatch[1].trim();
    }

    return { name, description, dir, skillFile: file, content };
  });
}

/**
 * Read .js-boost.json — per-developer local config (gitignored)
 * Returns { agents, guidelines, skills, disabledMcpServers }
 */
export function readLocalConfig(projectDir) {
  const configPath = path.join(projectDir, '.js-boost.json');
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * Write .js-boost.json
 */
export function writeLocalConfig(projectDir, config) {
  writeFile(path.join(projectDir, '.js-boost.json'), JSON.stringify(config, null, 2));
}

/**
 * Read .ai/mcp/mcp.json — team MCP server definitions
 * Returns { mcpServers: {} }
 */
export function readMcpConfig(aiDir) {
  const mcpPath = path.join(aiDir, 'mcp', 'mcp.json');
  if (!fs.existsSync(mcpPath)) return { mcpServers: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
    return { mcpServers: parsed.mcpServers || {} };
  } catch {
    return { mcpServers: {} };
  }
}

/**
 * Write .ai/mcp/mcp.json
 */
export function writeMcpConfig(aiDir, mcpConfig) {
  writeFile(path.join(aiDir, 'mcp', 'mcp.json'), JSON.stringify(mcpConfig, null, 2));
}

/**
 * Ensure a directory exists
 */
export function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write a file, creating parent dirs as needed
 */
export function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Sync a directory by replacing the destination with the current source contents.
 */
export function syncDir(sourceDir, targetDir) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }

  if (!fs.existsSync(sourceDir)) {
    return false;
  }

  ensureDir(path.dirname(targetDir));
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  return true;
}
