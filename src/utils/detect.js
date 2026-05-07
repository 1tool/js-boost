import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

function commandExists(cmd) {
  try {
    execSync(`command -v ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function dirExists(...segments) {
  return fs.existsSync(path.join(...segments));
}

/**
 * Detect which agents are installed on the system or present in the project.
 * Returns an array of agent keys.
 */
export function detectInstalledAgents(projectDir = process.cwd()) {
  const home = os.homedir();
  const detected = [];

  if (dirExists(home, '.claude') || dirExists(home, '.config', 'claude')) {
    detected.push('claude_code');
  }

  if (dirExists(home, '.cursor') || dirExists(projectDir, '.cursor')) {
    detected.push('cursor');
  }

  if (dirExists(projectDir, '.junie') || dirExists(home, '.junie')) {
    detected.push('junie');
  }

  if (commandExists('codex')) {
    detected.push('codex');
  }

  if (commandExists('amp') || dirExists(home, '.amp')) {
    detected.push('amp');
  }

  if (dirExists(home, '.kiro') || dirExists(projectDir, '.kiro')) {
    detected.push('kiro');
  }

  if (commandExists('opencode') || dirExists(home, '.opencode')) {
    detected.push('opencode');
  }

  // Copilot and Gemini are harder to detect — skip auto-detection

  return detected;
}