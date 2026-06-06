import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { parseOrgDocument } from './parseDocument.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('parseOrgDocument', () => {
  test('extracts title keyword and headings', () => {
    const content = readFileSync(join(__dirname, 'fixtures/headings-todo.org'), 'utf8');
    const doc = parseOrgDocument(content);

    assert.equal(doc.title, 'Heading Sample');
    assert.ok(doc.headings.length >= 3);
    assert.equal(doc.headings[0].title, 'Top level');
    assert.equal(doc.headings[1].level, 2);
    assert.equal(doc.headings[1].todo, 'TODO');
  });
});
