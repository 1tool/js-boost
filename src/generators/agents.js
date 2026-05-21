import { buildMcpMarkdownSection } from '../utils/mcp.js';

export function generateAgentsMd(guidelines, skills, mcpServers, options = {}) {
  const skillBasePath = options.skillBasePath || '.agents/skills';
  const sections = [];

  sections.push('# Project Guidelines');
  sections.push('');
  sections.push('---');
  sections.push('');

  if (guidelines.length > 0) {
    sections.push('## Guidelines');
    sections.push('');
    sections.push('These guidelines define conventions, patterns, and best practices for this project.');
    sections.push('');

    for (const g of guidelines) {
      sections.push(g.content);
      sections.push('');
    }
  }

  if (skills.length > 0) {
    sections.push('## Agent Skills');
    sections.push('');
    sections.push(`The following skills are registered in \`${skillBasePath}/\`. Load a skill when the task matches its description.`);
    sections.push('');

    for (const skill of skills) {
      sections.push(`### ${skill.name}`);
      if (skill.description) sections.push(`${skill.description}`);
      sections.push(`- **Skill file:** \`${skillBasePath}/${skill.dir}/SKILL.md\``);
      sections.push('');
    }
  }

  if (Object.keys(mcpServers).length > 0) {
    sections.push(buildMcpMarkdownSection(mcpServers));
  }

  return sections.join('\n');
}
