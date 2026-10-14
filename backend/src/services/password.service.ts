import argon2 from 'argon2';
import crypto from 'crypto';

let dummyHash: Promise<string> | undefined;
export async function verifyUnknownPassword(plain: string): Promise<void> {
  dummyHash ||= hashPassword(crypto.randomBytes(32).toString('hex'));
  await verifyPassword(await dummyHash, plain);
}

export async function hashPassword(plainPassword: string): Promise<string> {
  return await argon2.hash(plainPassword);
}

export async function verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
  return await argon2.verify(hashedPassword, plainPassword);
}
