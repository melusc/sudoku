// eslint-disable-next-line n/no-unsupported-features/node-builtins
import test, {type TestContext} from 'node:test';

import {nakedPairs} from '../../src/plugins/naked-pairs.ts';
import {Sudoku} from '../../src/sudoku.ts';

import {getComparableCells} from './helpers.ts';

const _ = undefined;

await test('nakedPairs should not change an empty sudoku.', (t: TestContext) => {
	const originalSudoku = new Sudoku(9);
	const modifiedSudoku = new Sudoku(9);

	nakedPairs(modifiedSudoku);
	t.assert.ok(!modifiedSudoku.anyChanged);

	t.assert.deepEqual(
		getComparableCells(modifiedSudoku),
		getComparableCells(originalSudoku),
	);
});

await test('nakedPairs should correctly find the pairs of "1" and "6".', (t: TestContext) => {
	const s = Sudoku.fromPrefilled(
		[
			[4, [1, 6], [1, 6], [7, 8], 3, 2, [1, 7, 8], 0, 5],
			//   ^  ^ ,  ^  ^                  ^ Remove this
		],
		9,
	);

	nakedPairs(s);
	t.assert.ok(s.anyChanged);

	t.assert.deepEqual([...s.getCell(6).candidates], [7, 8]);
});

await test('nakedPairs should not change anything upon finding ("1", "2", "5") across two cells', (t: TestContext) => {
	const candidates = [
		[1, 2, 5], // #1
		[3, 6, 7, 8],
		[1, 4, 6, 0],
		[1, 2, 5], // #2
		[1, 2, 5, 6],
		[4, 5, 0],
		[1, 5, 7, 8],
		[3, 5, 7],
		[1, 4, 8],
	];

	const s = Sudoku.fromPrefilled([_, _, _, candidates], 9);

	const row = s.getRow(3);

	nakedPairs(s);
	t.assert.ok(!s.anyChanged);

	for (let index = 0; index < 9; ++index) {
		t.assert.deepEqual([...row[index]!.candidates], candidates[index]!);
	}
});

await test('nakedPairs should find an incomplete naked pair', (t: TestContext) => {
	// The naked pair is [1, 2, 4]

	const s = Sudoku.fromPrefilled(
		[
			[
				[1, 2, 4], // #1
				[1, 2, 4], // #2
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 4], // #3, missing 2, though
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
			],
		],
		9,
	);

	nakedPairs(s);

	t.assert.deepEqual(
		s.getRow(0).map(({candidates}) => [...candidates]),
		[
			[1, 2, 4], // #1
			[1, 2, 4], // #2
			[3, 5, 6, 7, 8, 0],
			[3, 5, 6, 7, 8, 0],
			[1, 4], // #3
			[3, 5, 6, 7, 8, 0],
			[3, 5, 6, 7, 8, 0],
			[3, 5, 6, 7, 8, 0],
			[3, 5, 6, 7, 8, 0],
		],
	);
});

await test('nakedPairs should find an incomplete naked pair with incomplete cell as first', (t: TestContext) => {
	// The naked pair is [1, 2, 4]

	const s = Sudoku.fromPrefilled(
		[
			[
				[1, 4], // #1, missing 2, though
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 4], // #2
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 4], // #3
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
				[1, 2, 3, 4, 5, 6, 7, 8, 0],
			],
		],
		9,
	);

	nakedPairs(s);

	t.assert.deepEqual(
		s.getRow(0).map(({candidates}) => [...candidates]),
		[
			[1, 4], // #1
			[3, 5, 6, 7, 8, 0],
			[1, 2, 4], // #2
			[3, 5, 6, 7, 8, 0],
			[3, 5, 6, 7, 8, 0],
			[1, 2, 4], // #3
			[3, 5, 6, 7, 8, 0],
			[3, 5, 6, 7, 8, 0],
			[3, 5, 6, 7, 8, 0],
		],
	);
});
