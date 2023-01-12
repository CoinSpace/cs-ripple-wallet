import { errors } from 'cs-common';
import {
  deriveAddress,
  deriveKeypair,
  generateSeed,
} from 'ripple-keypairs';

export function getSecretFromSeed(seed) {
  const secret = generateSeed({ entropy: seed });
  return secret;
}

// ex generateAccount
export function getAddressFromSeed(seed) {
  const secret = generateSeed({ entropy: seed });
  const keypair = deriveKeypair(secret);
  const address = deriveAddress(keypair.publicKey);
  return address;
}

export function getAddressFromSecret(secret) {
  try {
    const keypair = deriveKeypair(secret);
    return deriveAddress(keypair.publicKey);
  } catch (err) {
    throw new errors.InvalidSecretError(undefined, { cause: err });
  }
}
