import assert from 'node:assert/strict';
import test from 'node:test';

import { clampPaneWidths, DEFAULT_PANE_WIDTHS } from '../src/lib/layoutUtils.ts';

test('pane width clamping keeps side panels within usable bounds', () => {
  assert.deepEqual(DEFAULT_PANE_WIDTHS, { left: 336, right: 320 });

  assert.deepEqual(
    clampPaneWidths(1800, 999, 999),
    { left: 460, right: 420 },
  );

  assert.deepEqual(
    clampPaneWidths(1440, 999, 999),
    { left: 296, right: 300 },
  );

  assert.deepEqual(
    clampPaneWidths(900, 999, 999),
    { left: 296, right: 288 },
  );

  assert.deepEqual(
    clampPaneWidths(1440, 0, 0),
    { left: 296, right: 288 },
  );
});
