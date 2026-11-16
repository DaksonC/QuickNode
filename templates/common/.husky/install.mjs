// Installs the git hooks on `npm install`. Husky is a devDependency, so it is
// absent in production installs (`npm ci --omit=dev`): skip quietly there.
try {
  const { default: husky } = await import('husky');
  const message = husky();
  if (message) console.log(message);
} catch (error) {
  if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error;
}
