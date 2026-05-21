export function generateKiroSteering(guidelines, skills, options = {}) {
  const skillBasePath = options.skillBasePath || '.agents/skills';
  const lines = [];

  lines.push('---');
  lines.push('inclusion: always');
  lines.push('---');
  lines.push('');
  lines.push('# Project Guidelines');
  lines.push('');

  if (guidelines.length > 0) {
    for (const g of guidelines) {
      lines.push(g.content);
      lines.push('');
    }
  }

  if (skills.length > 0) {
    lines.push('## Available Skills');
    lines.push('');
    lines.push('The following skill files contain detailed patterns. Read the relevant SKILL.md before working on tasks in that domain:');
    lines.push('');
    for (const skill of skills) {
      lines.push(`- **${skill.name}**: \`${skillBasePath}/${skill.dir}/SKILL.md\``);
      if (skill.description) lines.push(`  ${skill.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
