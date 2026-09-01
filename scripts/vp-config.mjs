import { execSync } from 'node:child_process';

// GitHub Actions and other CI set CI=true. Those runners do not have `vp`.
if (process.env.CI) {
  process.exit(0);
}

execSync('vp config', { stdio: 'inherit' });
