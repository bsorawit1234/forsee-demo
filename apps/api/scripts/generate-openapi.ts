import { writeFile } from 'node:fs/promises';
import { createApp } from '../src/main.js';
import { SwaggerModule } from '@nestjs/swagger';

const app = await createApp();
const config = app.getHttpAdapter().getInstance();
const document = config?.swaggerDocument;

if (document) {
  await writeFile(new URL('../../../packages/api-client/openapi.json', import.meta.url), `${JSON.stringify(document, null, 2)}\n`);
}

await app.close();
