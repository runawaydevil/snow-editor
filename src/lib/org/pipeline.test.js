import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';
import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';
import { enhanceOrgHtml } from './enhanceHtml.js';
import { orgToHtmlSync, orgToRawHtmlSync } from './pipeline.js';
import { ORG_SANITIZE_OPTIONS } from './constants.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures');

function loadFixture(name) {
  return readFileSync(join(fixturesDir, name), 'utf8');
}

function sanitizeInNode(html) {
  const window = new JSDOM('').window;
  const purify = DOMPurify(window);
  return purify.sanitize(html, ORG_SANITIZE_OPTIONS);
}

describe('Org pipeline', () => {
  test('renders headings and nested sections', () => {
    const html = orgToRawHtmlSync(loadFixture('headings-todo.org'));
    assert.match(html, /<h1[^>]*>.*Top level/i);
    assert.match(html, /<h2[^>]*>.*Nested task/i);
    assert.match(html, /<h3[^>]*>.*Deep section/i);
  });

  test('renders nested lists', () => {
    const html = orgToRawHtmlSync(loadFixture('nested-lists.org'));
    assert.match(html, /<ul>/);
    assert.match(html, /<li>.*child one/i);
  });

  test('renders tables with cozy class', () => {
    const raw = enhanceOrgHtml(orgToRawHtmlSync(loadFixture('table.org')));
    assert.match(raw, /class="org-table"/);
    assert.match(raw, /<table/);
    assert.match(raw, /Snow/);
  });

  test('renders checklist items', () => {
    const html = orgToRawHtmlSync(loadFixture('checklist.org'));
    assert.match(html, /open task/);
    assert.match(html, /done task/);
  });

  test('strips script tags from export html blocks', () => {
    const raw = enhanceOrgHtml(orgToRawHtmlSync(loadFixture('export-html.org')));
    const clean = sanitizeInNode(raw);
    assert.match(clean, /safe/);
    assert.doesNotMatch(clean, /<script/i);
  });

  test('sanitize removes scripts in node environment', () => {
    const dirty = '<p>ok</p><script>alert(1)</script>';
    const clean = sanitizeInNode(dirty);
    assert.match(clean, /ok/);
    assert.doesNotMatch(clean, /<script/i);
  });
});
