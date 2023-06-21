import alias from '@rollup/plugin-alias';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';

import { fileURLToPath } from 'node:url';

export default {
  input: 'index.js',
  output: {
    file: 'bundle.js',
    format: 'es',
    sourcemap: 'inline',
  },
  external: [
    '@coinspace/cs-common',
    '@coinspace/cs-common/errors',
    fileURLToPath(new URL('lib/errors.js', import.meta.url)),
  ],
  plugins: [
    alias({
      entries: {
        crypto: fileURLToPath(new URL('polyfills/crypto.js', import.meta.url)),
        stream: fileURLToPath(new URL('polyfills/stream.js', import.meta.url)),
        // Empty
        http: fileURLToPath(new URL('polyfills/empty.js', import.meta.url)),
        https: fileURLToPath(new URL('polyfills/empty.js', import.meta.url)),
        net: fileURLToPath(new URL('polyfills/empty.js', import.meta.url)),
        zlib: fileURLToPath(new URL('polyfills/empty.js', import.meta.url)),
        tls: fileURLToPath(new URL('polyfills/empty.js', import.meta.url)),
        tty: fileURLToPath(new URL('polyfills/empty.js', import.meta.url)),
        os: fileURLToPath(new URL('polyfills/empty.js', import.meta.url)),
      },
    }),
    commonjs({ strictRequires: true, transformMixedEsModules: true }),
    resolve({
      preferBuiltins: false,
      mainFields: ['browser', 'module', 'main'],
    }),
    json(),
  ],
};
