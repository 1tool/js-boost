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

    // Parse YAML frontmatter: ---\nname: ...\ndescription: ...\n---
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
      // Fallback: try first heading
      const headingMatch = content.match(/^#+\s*(.+)$/m);
      if (headingMatch) name = headingMatch[1].trim();
    }

    return { name, description, dir, skillFile: file, content };
  });
}

/**
 * Read js-boost.config.json if it exists
 */
export function readConfig(projectDir) {
  const configPath = path.join(projectDir, 'js-boost.config.json');
  if (!fs.existsSync(configPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    return {};
  }
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
