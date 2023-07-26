import { errors } from '@coinspace/cs-common';
import {
  deriveAddress,
  deriveKeypair,
  generateSeed,
} from 'ripple-keypairs';

export function getSecretFromSeed(seed) {
  const secret = generateSeed({ entropy: Array.from(seed) });
  return secret;
}

export function getAddressFromSeed(seed) {
  const secret = generateSeed({ entropy: Array.from(seed) });
  const keypair = deriveKeypair(secret);
  return deriveAddress(keypair.publicKey);
}

export function getKeypairFromSecret(secret) {
  return deriveKeypair(secret);
}

export function getAddressFromSecret(secret) {
  try {
    const keypair = deriveKeypair(secret);
    return deriveAddress(keypair.publicKey);
  } catch (err) {
    throw new errors.InvalidPrivateKeyError(undefined, { cause: err });
  }
}
