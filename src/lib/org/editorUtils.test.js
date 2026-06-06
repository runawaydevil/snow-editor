import assert from 'node:assert';
import { describe, test } from 'node:test';
import {
  adjustHeading,
  isChecklistLine,
  toggleChecklistLine,
} from './editorUtils.js';

describe('Org editor utils', () => {
  test('toggleChecklistLine switches states', () => {
    assert.equal(toggleChecklistLine('- [ ] task'), '- [X] task');
    assert.equal(toggleChecklistLine('- [X] task'), '- [ ] task');
    assert.ok(isChecklistLine('- [ ] task'));
  });

  test('adjustHeading changes star count', () => {
    assert.equal(adjustHeading('* Title', 1), '** Title');
    assert.equal(adjustHeading('** Title', -1), '* Title');
  });
});
