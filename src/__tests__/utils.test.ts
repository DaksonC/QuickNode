describe('QuickNode Utils', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should validate Node.js version format', () => {
    const nodeVersion = process.version;
    expect(nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
  });
});
