import { errors } from '@coinspace/cs-common';
import {
  deriveAddress,
  deriveKeypair,
  generateAddress,
} from 'ripple-lib';

export function getSecretFromSeed(seed) {
  const data = generateAddress({ entropy: Array.from(seed) });
  return data.secret;
}

export function getAddressFromSeed(seed) {
  const data = generateAddress({ entropy: Array.from(seed) });
  return data.address;
}

export function getAddressFromSecret(secret) {
  try {
    const keypair = deriveKeypair(secret);
    return deriveAddress(keypair.publicKey);
  } catch (err) {
    throw new errors.InvalidPrivateKeyError(undefined, { cause: err });
  }
}
