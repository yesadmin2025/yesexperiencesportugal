import { Generator, getConfig } from '@tanstack/router-generator';
const config = await getConfig({}, process.cwd());
const gen = new Generator({ config, root: process.cwd() });
await gen.run();
console.log('OK');
