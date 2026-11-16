import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { checkProject, classifyDomainImport } from '../dist/commands/check.js';
import { makeProject, makeTmp, runQn, write } from './helpers.js';

describe('classifyDomainImport', () => {
  const src = path.join('/p', 'src');
  const file = path.join(src, 'domain', 'use-cases', 'x.ts');
  const rule = (specifier) => classifyDomainImport(specifier, file, src)?.rule;

  it('allows domain files and Node built-ins', () => {
    assert.equal(rule('../entities/user'), undefined);
    assert.equal(rule('node:crypto'), undefined);
    assert.equal(rule('crypto'), undefined);
    assert.equal(rule('fs/promises'), undefined);
  });

  it('names the broken rule for everything else', () => {
    assert.equal(rule('../../infrastructure/database/connection'), 'domain-imports-infrastructure');
    assert.equal(rule('@/infrastructure/logger'), 'domain-imports-infrastructure');
    assert.equal(rule('express'), 'domain-imports-http-framework');
    assert.equal(rule('@nestjs/common'), 'domain-imports-http-framework');
    assert.equal(rule('typeorm'), 'domain-imports-orm');
    assert.equal(rule('sequelize/lib/model'), 'domain-imports-orm');
    assert.equal(rule('@prisma/client'), 'domain-imports-orm');
    assert.equal(rule('class-validator'), 'domain-imports-package');
    assert.equal(rule('../../server'), 'domain-imports-outside');
  });
});

describe('checkProject', () => {
  it('passes on both templates as generated', async (t) => {
    for (const template of ['typescript', 'javascript']) {
      const result = await checkProject(await makeProject(t, template));
      assert.equal(result.ok, true, template);
      assert.ok(result.filesChecked >= 3);
    }
  });

  it('reports each violation with file and line, skipping tests', async (t) => {
    const root = await makeTmp(t);
    await write(path.join(root, 'package.json'), '{}');
    await write(path.join(root, 'src', 'infrastructure', 'db.js'), "require('pg');");
    await write(path.join(root, 'src', 'domain', 'user.js'), "const crypto = require('node:crypto');\nconst express = require('express');\n");
    await write(path.join(root, 'src', 'domain', 'user.test.js'), "require('jest');");
    await write(path.join(root, 'src', 'domain', '__tests__', 'a.js'), "require('jest');");
    await write(path.join(root, 'src', 'domain', 'repo.ts'), "// import x from 'typeorm';\nimport { db } from '../infrastructure/db';\n");

    const result = await checkProject(path.join(root, 'src'));
    assert.equal(result.ok, false);
    assert.equal(result.filesChecked, 2);
    assert.deepEqual(
      result.violations.map((v) => `${v.file}:${v.line} ${v.rule}`),
      ['src/domain/repo.ts:2 domain-imports-infrastructure', 'src/domain/user.js:2 domain-imports-http-framework']
    );
  });
});

describe('qn check (CLI)', () => {
  it('exits with 1 on violations, readable and as JSON', async (t) => {
    const root = await makeProject(t, 'javascript');
    await write(path.join(root, 'src', 'domain', 'entities', 'bad.js'), "const { Model } = require('sequelize');\n");

    const text = await runQn(root, 'check');
    assert.equal(text.code, 1);
    assert.match(text.stdout, /1 dependency rule violation/);
    assert.match(text.stdout, /src\/domain\/entities\/bad\.js:1 {2}imports "sequelize"/);

    const json = await runQn(root, 'check', '--json');
    assert.equal(json.code, 1);
    const result = JSON.parse(json.stdout);
    assert.equal(result.ok, false);
    assert.equal(result.violations[0].rule, 'domain-imports-orm');
  });

  it('exits with 0 when the rule holds', async (t) => {
    const { code, stdout } = await runQn(await makeProject(t, 'typescript'), 'check');
    assert.equal(code, 0);
    assert.match(stdout, /Dependency rule respected/);
  });
});
