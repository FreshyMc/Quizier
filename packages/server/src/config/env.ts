import { config as loadEnv } from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const findProjectRootPath = () => {
  let currentPath = dirname(fileURLToPath(import.meta.url));

  while (true) {
    const packageJsonPath = resolve(currentPath, 'package.json');
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
          name?: string;
        };

        if (packageJson.name === 'quizier') {
          return currentPath;
        }
      } catch {}
    }

    const parentPath = dirname(currentPath);
    if (parentPath === currentPath) {
      throw new Error('Quizier project root could not be resolved');
    }

    currentPath = parentPath;
  }
};

const projectRootPath = findProjectRootPath();

loadEnv({ path: resolve(projectRootPath, '.env.example') });
loadEnv({ path: resolve(projectRootPath, '.env'), override: true });

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} must be set`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  clientUrl: process.env.CLIENT_URL,
  clientUrls: (process.env.CLIENT_URLS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
  mongodbUri: requireEnv('MONGODB_URI'),
  jwtSecret: requireEnv('JWT_SECRET'),
  jwtRefreshSecret: requireEnv('JWT_REFRESH_SECRET'),
  adminEmail: requireEnv('ADMIN_EMAIL'),
  adminPassword: requireEnv('ADMIN_PASSWORD'),
};
