import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { generate } from './index.js';

export function watch(projectDir) {
  const aiDir = path.join(projectDir, '.ai');
  const configPath = path.join(projectDir, 'js-boost.config.json');

  console.log('');
  console.log(chalk.bold.blue('⚡ js-boost') + chalk.dim(' — watch mode'));
  console.log(chalk.dim(`  Watching: ${aiDir}`));
  console.log(chalk.dim('  Press Ctrl+C to stop'));
  console.log('');

  // Initial generation
  generate(projectDir).catch(err => {
    console.error(chalk.red('  Error during initial generation:'), err.message);
  });

  const watcher = chokidar.watch([
    path.join(aiDir, '**', '*.md'),
    configPath,
  ], {
    ignoreInitial: true,
    persistent: true,
  });

  let debounceTimer = null;

  const handleChange = (filePath) => {
    const rel = path.relative(projectDir, filePath);
    console.log(chalk.dim(`  Changed: ${rel}`));

    // Debounce — wait 300ms after last change before regenerating
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        await generate(projectDir);
      } catch (err) {
        console.error(chalk.red('  Error during regeneration:'), err.message);
      }
    }, 300);
  };

  watcher
    .on('add', handleChange)
    .on('change', handleChange)
    .on('unlink', handleChange)
    .on('error', err => console.error(chalk.red('  Watcher error:'), err));

  process.on('SIGINT', () => {
    console.log('');
    console.log(chalk.dim('  Stopping watcher...'));
    watcher.close();
    process.exit(0);
  });
}
