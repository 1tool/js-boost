export function generateJunieGuidelines(guidelines, skills, options = {}) {
  const skillBasePath = options.skillBasePath || '.agents/skills';
  const sections = [];

  sections.push('# Project Guidelines');
  sections.push('');

  if (guidelines.length > 0) {
    for (const g of guidelines) {
      sections.push(g.content);
      sections.push('');
    }
  }

  if (skills.length > 0) {
    sections.push('## Available Skills');
    sections.push('');
    sections.push('The following skill files contain detailed patterns. Read the relevant SKILL.md before working on tasks in that domain:');
    sections.push('');
    for (const skill of skills) {
      sections.push(`- **${skill.name}**: \`${skillBasePath}/${skill.dir}/SKILL.md\``);
      if (skill.description) sections.push(`  ${skill.description}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}
