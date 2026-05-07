/**
 * Generate .kiro/steering/guidelines.md
 * Kiro uses steering documents in .kiro/steering/ for project context.
 */
export function generateKiroSteering(guidelines, skills, config) {
  const projectName = config.projectName || 'This project';
  const lines = [];

  lines.push('---');
  lines.push('inclusion: always');
  lines.push('---');
  lines.push('');
  lines.push(`# ${projectName} — AI Guidelines`);
  lines.push('');

  if (guidelines.length > 0) {
    for (const g of guidelines) {
      lines.push(g.content);
      lines.push('');
    }
  }

  if (skills.length > 0) {
    lines.push('## Skills');
    lines.push('');
    lines.push('The following skills are available for this project:');
    lines.push('');
    for (const skill of skills) {
      lines.push(`- **${skill.name}**: ${skill.description || skill.dir}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}