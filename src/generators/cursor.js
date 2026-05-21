export function generateCursorRules(guidelines, skills, options = {}) {
  const skillBasePath = options.skillBasePath || '.agents/skills';
  const sections = [];

  sections.push('---');
  sections.push('description: Project guidelines and conventions');
  sections.push('globs: ["**/*"]');
  sections.push('alwaysApply: true');
  sections.push('---');
  sections.push('');
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
    for (const skill of skills) {
      sections.push(`- **${skill.name}**: \`${skillBasePath}/${skill.dir}/SKILL.md\``);
      if (skill.description) sections.push(`  ${skill.description}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

export function generateCursorRulesLegacy(guidelines, skills, options = {}) {
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
    sections.push('## Skills');
    sections.push('');
    for (const skill of skills) {
      sections.push(`- **${skill.name}**: ${skillBasePath}/${skill.dir}/SKILL.md`);
      if (skill.description) sections.push(`  ${skill.description}`);
    }
  }

  return sections.join('\n');
}
