import { createProject } from '../../commands/create.js';
import fs from 'fs-extra';
import path from 'path';

// Mock fs-extra
jest.mock('fs-extra');
jest.mock('inquirer');

const mockFs = fs as jest.Mocked<typeof fs>;

describe('Create Command', () => {
  const testDir = '/tmp/test-project';

  beforeEach(() => {
    jest.clearAllMocks();
    (mockFs.ensureDir as jest.Mock).mockResolvedValue(undefined);
    (mockFs.copy as jest.Mock).mockResolvedValue(undefined);
    (mockFs.readJson as jest.Mock).mockResolvedValue({ name: 'test-project' });
    (mockFs.writeJson as jest.Mock).mockResolvedValue(undefined);
  });

  it('should create a new TypeScript project', async () => {
    const options = { typescript: true };
    
    await createProject('test-project', options);

    expect(mockFs.ensureDir).toHaveBeenCalledWith(
      path.resolve(process.cwd(), 'test-project')
    );
    expect(mockFs.copy).toHaveBeenCalled();
  });

  it('should create project in current directory when using "."', async () => {
    const options = { typescript: true };
    
    await createProject('.', options);

    expect(mockFs.ensureDir).not.toHaveBeenCalled();
    expect(mockFs.copy).toHaveBeenCalled();
  });

  it('should handle JavaScript template', async () => {
    const options = { javascript: true };
    
    await createProject('js-project', options);

    expect(mockFs.copy).toHaveBeenCalled();
    // Verify the correct template directory is used
    const copyCall = mockFs.copy.mock.calls[0];
    expect(copyCall[0]).toContain('javascript');
  });
});
