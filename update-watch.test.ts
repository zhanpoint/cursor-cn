import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { repairGate } from './update-watch.ts';

test('wait for stable updater output and attempt each broken snapshot once', () => {
  const gate = repairGate();
  assert.equal(gate('old', true), false);
  assert.equal(gate(null, false), false);
  assert.equal(gate('updating', false), false);
  assert.equal(gate('new', false), false);
  assert.equal(gate('new', false), true);
  assert.equal(gate('new', false), false);
  assert.equal(gate('new', false), false);
  assert.equal(gate('new', true), false);
  assert.equal(gate('next', false), false);
  assert.equal(gate('next', false), true);
});

test('incomplete installation resets stabilization without triggering repair', () => {
  const gate = repairGate();
  assert.equal(gate('new', false), false);
  assert.equal(gate(null, false), false);
  assert.equal(gate('new', false), false);
  assert.equal(gate('new', false), true);
});
