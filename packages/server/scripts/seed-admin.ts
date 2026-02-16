import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import { UserRole } from '@quizier/shared';

import { env } from '../src/config/env.js';
import { UserModel } from '../src/models/user.model.js';

const adminEmail = env.adminEmail;
const adminPassword = env.adminPassword;
const mongodbUri = env.mongodbUri;

if (!adminEmail || !adminPassword) {
  throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set before running seed');
}

if (!mongodbUri) {
  throw new Error('MONGODB_URI must be set before running seed');
}

const getAvailableUsername = async (baseUsername: string) => {
  const sanitizedBase = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, '_') || 'admin';
  let candidate = sanitizedBase;
  let counter = 1;

  while (await UserModel.exists({ username: candidate })) {
    candidate = `${sanitizedBase}_${counter}`;
    counter += 1;
  }

  return candidate;
};

const createPasswordHash = async (password: string) => {
  const passwordSalt = randomBytes(16).toString('hex');
  const passwordHash = await argon2.hash(`${password}${passwordSalt}`, {
    type: argon2.argon2id,
  });

  return { passwordHash, passwordSalt };
};

const seedAdmin = async () => {
  await mongoose.connect(mongodbUri);

  const existingByEmail = await UserModel.findOne({ email: adminEmail.toLowerCase() });
  const { passwordHash, passwordSalt } = await createPasswordHash(adminPassword);

  if (existingByEmail) {
    existingByEmail.passwordHash = passwordHash;
    existingByEmail.passwordSalt = passwordSalt;
    existingByEmail.role = UserRole.ADMIN;
    await existingByEmail.save();
    console.log(`Admin user updated: ${existingByEmail.email}`);
    return;
  }

  const baseUsername = adminEmail.split('@')[0] || 'admin';
  const username = await getAvailableUsername(baseUsername);

  const createdAdmin = await UserModel.create({
    email: adminEmail.toLowerCase(),
    username,
    passwordHash,
    passwordSalt,
    role: UserRole.ADMIN,
  });

  console.log(`Admin user created: ${createdAdmin.email} (${createdAdmin.username})`);
};

seedAdmin()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
