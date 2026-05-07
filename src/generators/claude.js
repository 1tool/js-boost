import { buildMcpMarkdownSection } from '../utils/mcp.js';

/**
 * Generate CLAUDE.md for Claude Code.
 *
 * Claude Code reads CLAUDE.md from the project root. We include the full
 * guidelines content here (Claude benefits from having everything upfront),
 * plus Claude-specific directives for loading skills.
 */
export function generateClaudeMd(guidelines, skills, mcpServers) {
  const sections = [];

  sections.push('# Project Guidelines');
  sections.push('');
  sections.push('---');
  sections.push('');

  // Claude Code: Skills loading instruction
  if (skills.length > 0) {
    sections.push('## Skills');
    sections.push('');
    sections.push('When starting work on a task, check if any of the following skills apply and load the relevant `SKILL.md` file before proceeding:');
    sections.push('');
    for (const skill of skills) {
      sections.push(`- **${skill.name}** — ${skill.description || 'see SKILL.md'}`);
      sections.push(`  - Load: \`.ai/skills/${skill.dir}/SKILL.md\``);
    }
    sections.push('');
    sections.push('---');
    sections.push('');
  }

  if (guidelines.length > 0) {
    for (const g of guidelines) {
      sections.push(g.content);
      sections.push('');
    }
    sections.push('---');
    sections.push('');
  }

  if (Object.keys(mcpServers).length > 0) {
    sections.push(buildMcpMarkdownSection(mcpServers));
    sections.push('');
    sections.push('> MCP servers are configured in `.mcp.json`. Claude Code will pick them up automatically.');
    sections.push('');
  }

  return sections.join('\n');
}
