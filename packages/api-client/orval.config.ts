import { defineConfig } from 'orval';

export default defineConfig({
  forsee: {
    input: './openapi.json',
    output: {
      mode: 'tags-split',
      target: './src/generated/forsee.ts',
      schemas: './src/generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      prettier: true,
    },
  },
});
