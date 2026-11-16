import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { doctor, satisfiesMinimum } from '../dist/commands/doctor.js';
import { makeProject, write } from './helpers.js';

/** Fake runner: docker present, npm audit answers `audit`. */
const fakeCapture = (audit = { metadata: { vulnerabilities: { low: 0, moderate: 0, high: 0, critical: 0 } } }, docker = true) =>
  async (command, args) => {
    if (command === 'docker') return docker ? { code: 0, stdout: 'Docker version 27.0.0\n' } : { stdout: '', error: 'ENOENT' };
    if (args.includes('audit')) return { code: 0, stdout: typeof audit === 'string' ? audit : JSON.stringify(audit) };
    return { code: 1, stdout: '' };
  };

const status = (result) => Object.fromEntries(result.checks.map((check) => [check.name, check.status]));

describe('satisfiesMinimum', () => {
  it('compares versions with >= ranges', () => {
    assert.equal(satisfiesMinimum('22.13.0', '>=22.13.0'), true);
    assert.equal(satisfiesMinimum('v24.1.0', '>= 22.13'), true);
    assert.equal(satisfiesMinimum('22.12.9', '>=22.13.0'), false);
    assert.equal(satisfiesMinimum('22.13.0', '^22'), undefined);
  });
});

describe('qn doctor', () => {
  it('is healthy for a new project with a lockfile', async (t) => {
    const root = await makeProject(t, 'javascript');
    await write(path.join(root, 'package-lock.json'), '{}');
    const result = await doctor({ cwd: root, capture: fakeCapture(), nodeVersion: '22.13.0' });
    assert.deepEqual(status(result), { node: 'ok', env: 'ok', template: 'ok', docker: 'ok', audit: 'ok', check: 'ok' });
    assert.equal(result.ok, true);
  });

  it('fails on old Node, placeholder secrets, high vulnerabilities and rule violations', async (t) => {
    const root = await makeProject(t, 'javascript');
    await write(path.join(root, 'package-lock.json'), '{}');
    await fs.writeFile(path.join(root, '.env'), 'JWT_SECRET=change-me\n');
    await write(path.join(root, 'src', 'domain', 'bad.js'), "require('express');");
    const audit = { metadata: { vulnerabilities: { low: 1, moderate: 0, high: 2, critical: 1, total: 4 } } };
    const result = await doctor({ cwd: root, capture: fakeCapture(audit), nodeVersion: '20.0.0' });
    assert.deepEqual(status(result), { node: 'fail', env: 'fail', template: 'ok', docker: 'ok', audit: 'fail', check: 'fail' });
    assert.equal(result.ok, false);
    const env = result.checks.find((check) => check.name === 'env');
    assert.match(env.message, /JWT_SECRET/);
    assert.doesNotMatch(env.message, /change-me$/);
    assert.match(result.checks.find((check) => check.name === 'audit').message, /^3 high or critical/);
  });

  it('only warns for missing Docker, missing variables, no lockfile or audit errors', async (t) => {
    const root = await makeProject(t, 'javascript');
    const env = await fs.readFile(path.join(root, '.env'), 'utf8');
    await fs.writeFile(path.join(root, '.env'), env.replace(/^PORT=.*$/m, ''));
    const noLock = await doctor({ cwd: root, capture: fakeCapture(undefined, false), nodeVersion: '22.13.0' });
    assert.deepEqual(status(noLock), { node: 'ok', env: 'warn', template: 'ok', docker: 'warn', audit: 'warn', check: 'ok' });
    assert.equal(noLock.ok, true);
    assert.match(noLock.checks.find((check) => check.name === 'env').message, /PORT/);

    await write(path.join(root, 'package-lock.json'), '{}');
    const offline = await doctor({ cwd: root, capture: fakeCapture('npm ERR! network'), nodeVersion: '22.13.0' });
    assert.equal(status(offline).audit, 'warn');
    const skipped = await doctor({ cwd: root, capture: fakeCapture(), nodeVersion: '22.13.0', offline: true });
    assert.equal(status(skipped).audit, 'skip');
  });

  it('fails when .env is missing', async (t) => {
    const root = await makeProject(t, 'typescript');
    await fs.rm(path.join(root, '.env'));
    const result = await doctor({ cwd: root, capture: fakeCapture(), nodeVersion: '22.13.0', offline: true });
    assert.equal(status(result).env, 'fail');
  });
});

describe('qn doctor with CRLF files', () => {
  it('reads a .env with Windows line endings', async (t) => {
    const root = await makeProject(t, 'javascript');
    const env = await fs.readFile(path.join(root, '.env'), 'utf8');
    await fs.writeFile(path.join(root, '.env'), `${env.replace(/^JWT_SECRET=.*$/m, 'JWT_SECRET=change-me')}`.replace(/\n/g, '\r\n'));
    const result = await doctor({ cwd: root, capture: fakeCapture(), nodeVersion: '22.13.0', offline: true });
    const check = result.checks.find((item) => item.name === 'env');
    assert.equal(check.status, 'fail');
    assert.match(check.message, /JWT_SECRET/);
  });
});
