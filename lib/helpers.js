import { errors } from '@coinspace/cs-common';
import lib from 'ripple-lib';

export function getSecretFromSeed(seed) {
  const data = lib.generateAddress({ entropy: Array.from(seed) });
  return data.secret;
}

export function getAddressFromSeed(seed) {
  const data = lib.generateAddress({ entropy: Array.from(seed) });
  return data.address;
}

export function getAddressFromSecret(secret) {
  try {
    const keypair = lib.deriveKeypair(secret);
    return lib.deriveAddress(keypair.publicKey);
  } catch (err) {
    throw new errors.InvalidPrivateKeyError(undefined, { cause: err });
  }
}
