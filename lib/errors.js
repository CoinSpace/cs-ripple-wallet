import * as errors from '@coinspace/cs-common/errors';
export * from '@coinspace/cs-common/errors';

export class InvalidDestinationTagError extends errors.InvalidMetaError {
  name = 'InvalidDestinationTagError';
  constructor(destinationTag, options) {
    super(`Invalid Destination Tag: "${destinationTag}"`, {
      ...options,
      meta: 'destinationTag',
    });
  }
}

export class InvalidInvoiceIDError extends errors.InvalidMetaError {
  name = 'InvalidInvoiceIDError';
  constructor(invoiceId, options) {
    super(`Invalid invoiceId: "${invoiceId}"`, {
      ...options,
      meta: 'invoiceId',
    });
  }
}

// tecDST_TAG_NEEDED
export class DestinationTagNeededError extends errors.InvalidMetaError {
  name = 'DestinationTagNeededError';
  constructor(message, options) {
    super(message || 'Destination Tag Needed', {
      ...options,
      meta: 'invoiceId',
    });
  }
}
