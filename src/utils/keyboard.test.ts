import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEditableTarget } from './keyboard';

test('form controls and editable text keep their own arrow keys', () => {
  for (const tagName of ['INPUT', 'SELECT', 'TEXTAREA']) {
    assert.equal(isEditableTarget({ tagName }), true, tagName);
  }
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true, 'contenteditable');
});

test('other targets let arrow keys switch images', () => {
  assert.equal(isEditableTarget({ tagName: 'BUTTON' }), false);
  assert.equal(isEditableTarget({ tagName: 'BODY' }), false);
  assert.equal(isEditableTarget(null), false);
});
