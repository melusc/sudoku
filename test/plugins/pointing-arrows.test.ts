// eslint-disable-next-line n/no-unsupported-features/node-builtins
import test, {type TestContext} from 'node:test';

import {pointingArrows} from '../../src/plugins/pointing-arrows.js';
import {Sudoku} from '../../src/sudoku.js';

import {getComparableCells} from './helpers.js';

await test('pointingArrows should not change an empty sudoku.', (t: TestContext) => {
	const s = new Sudoku(9);

	const unchanged = getComparableCells(s);

	pointingArrows(s);
	t.assert.ok(!s.anyChanged);

	t.assert.deepEqual(getComparableCells(s), unchanged);
});

await test('pointingArrows should find a pointing arrow of 3s.', (t: TestContext) => {
	const s = Sudoku.fromPrefilled(
		[
			[[2, 4, 5, 8], 1, 7, 0, [2, 4, 5], 3, 6, [4, 8], [2, 4, 8]],
			[
				[2, 3, 4, 5, 6], // Remove "3" from here
				[2, 3, 4, 5], // And here
				[3, 6], // And here
				[1, 2, 5, 7],
				8,
				[5, 7],
				[1, 3, 0], // Pointing arrow here
				[1, 4, 0],
				[1, 2, 3, 4, 0], // And here
			],
			[0, [2, 3, 4, 8], [3, 6, 8], [1, 2], [2, 4, 6], [4, 6], 5, [1, 4, 8], 7],
		],
		9,
	);

	pointingArrows(s);
	t.assert.ok(s.anyChanged);

	t.assert.deepEqual([...s.getCell(9).candidates], [2, 4, 5, 6]);

	t.assert.deepEqual([...s.getCell(10).candidates], [2, 4, 5]);

	const cell11 = s.getCell(11);
	t.assert.equal(cell11.element, 6);
	t.assert.equal(cell11.candidates.size, 0);
});

await test('pointingArrows should find a pointing arrow of 2s.', (t: TestContext) => {
	const s = Sudoku.fromPrefilled(
		[
			[
				7,
				[2, 3, 4, 8, 0], // Remove "2" from here
				1,
				[2, 8], // Pointing arrow here
				[2, 4, 0], // And here
				[4, 8, 0],
				[3, 8, 0],
				6,
				5,
			],
			[
				[2, 4, 6, 8],
				[2, 4, 8, 0],
				[6, 8, 0],
				[5, 7],
				3,
				[5, 7, 8],
				[1, 8, 0],
				[1, 4, 8, 0],
				[1, 4, 8, 0],
			],
			[[3, 4, 8], [3, 4, 8, 0], 5, 6, [4, 0], 1, 7, 2, [3, 4, 8, 0]],
		],
		9,
	);

	pointingArrows(s);
	t.assert.ok(s.anyChanged);

	t.assert.deepEqual([...s.getCell(1).candidates], [3, 4, 8, 0]);
});
