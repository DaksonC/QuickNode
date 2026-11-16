const assert = require('node:assert/strict');
const __Name__ = require('../domain/entities/__name__');
const {
  Create__Name__UseCase,
  Delete__Name__UseCase,
  Get__Name__UseCase,
  GetAll__Names__UseCase,
  __Name__NotFoundError,
  Update__Name__UseCase,
} = require('../domain/use-cases/__name__-use-cases');

/** In-memory repository: use cases are tested without a database or mocks. */
class InMemory__Name__Repository {
  constructor() {
    this.records = new Map();
  }

  async findById(id) {
    return this.records.get(id) ?? null;
  }

  async findAll() {
    return [...this.records.values()];
  }

  async create(data) {
    const record = new __Name__(String(this.records.size + 1), data.name);
    this.records.set(record.id, record);
    return record;
  }

  async update(id, data) {
    const record = this.records.get(id);
    if (!record) return null;
    const updated = data.name === undefined ? record : record.rename(data.name);
    this.records.set(id, updated);
    return updated;
  }

  async delete(id) {
    return this.records.delete(id);
  }
}

describe('__Name__ use cases', () => {
  let repository;

  beforeEach(() => {
    repository = new InMemory__Name__Repository();
  });

  it('creates and lists records', async () => {
    const createUseCase = new Create__Name__UseCase(repository);
    const created = await createUseCase.execute({ name: 'First' });
    const all = await new GetAll__Names__UseCase(repository).execute();

    assert.equal(created.name, 'First');
    assert.deepEqual(all, [created]);
  });

  it('gets a record by id', async () => {
    const created = await repository.create({ name: 'First' });

    const getUseCase = new Get__Name__UseCase(repository);

    assert.deepEqual(await getUseCase.execute(created.id), created);
  });

  it('fails for an unknown id', async () => {
    const getUseCase = new Get__Name__UseCase(repository);

    await assert.rejects(getUseCase.execute('missing'), __Name__NotFoundError);
  });

  it('updates a record', async () => {
    const created = await repository.create({ name: 'First' });

    const updateUseCase = new Update__Name__UseCase(repository);
    const updated = await updateUseCase.execute(created.id, { name: 'Second' });

    assert.equal(updated.name, 'Second');
  });

  it('deletes a record', async () => {
    const created = await repository.create({ name: 'First' });

    await new Delete__Name__UseCase(repository).execute(created.id);

    assert.equal(repository.records.size, 0);
  });
});
