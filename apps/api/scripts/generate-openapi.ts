import { writeFile } from 'node:fs/promises';
import { createApp } from '../src/main.js';

const app = await createApp();
const document = app.getHttpAdapter().getInstance().forseeOpenapiDocument;

if (document) {
  await writeFile(new URL('../../../packages/api-client/openapi.json', import.meta.url), `${JSON.stringify(document, null, 2)}\n`);
}

await app.close();
