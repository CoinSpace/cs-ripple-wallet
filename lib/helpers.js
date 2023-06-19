import { errors } from '@coinspace/cs-common';
import keypairs from 'ripple-keypairs';

export function getSecretFromSeed(seed) {
  const secret = keypairs.generateSeed({ entropy: seed });
  return secret;
}

// ex generateAccount
export function getAddressFromSeed(seed) {
  const secret = keypairs.generateSeed({ entropy: seed });
  const keypair = keypairs.deriveKeypair(secret);
  const address = keypairs.deriveAddress(keypair.publicKey);
  return address;
}

export function getAddressFromSecret(secret) {
  try {
    const keypair = keypairs.deriveKeypair(secret);
    return keypairs.deriveAddress(keypair.publicKey);
  } catch (err) {
    throw new errors.InvalidPrivateKeyError(undefined, { cause: err });
  }
}
