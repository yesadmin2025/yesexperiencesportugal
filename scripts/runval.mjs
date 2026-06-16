import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// stub asset extensions
for (const ext of ['.jpg','.jpeg','.png','.webp','.svg','.mp4','.json']) {
  require.extensions[ext] = () => ({});
}
