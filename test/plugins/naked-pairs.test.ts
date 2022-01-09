import test from 'ava';

import {Sudoku} from '../../src/sudoku.js';

import {nakedPairs} from '../../src/plugins/naked-pairs.js';

import {getComparableCells} from './helpers.js';

test('nakedPairs should not change an empty sudoku.', t => {
	const originalSudoku = new Sudoku();
	const modifiedSudoku = new Sudoku();

	nakedPairs(modifiedSudoku);
	t.false(modifiedSudoku.anyChanged);

	t.deepEqual(
		getComparableCells(modifiedSudoku),
		getComparableCells(originalSudoku),
	);
});

test('nakedPairs should correctly find the pairs of "1" and "6".', t => {
	const s = new Sudoku();

	const possibles: Array<number | number[]> = [
		4,
		[1, 6],
		[1, 6],
		[7, 8],
		3,
		2,
		[1, 7, 8],
		9,
		5,
	];

	const block = s.getBlock(0);

	for (const [index, possible] of possibles.entries()) {
		if (Array.isArray(possible)) {
			block[index]!.possible = new Set(possible);
		} else {
			block[index]!.setContent(possible);
		}
	}

	nakedPairs(s);
	t.true(s.anyChanged);

	t.deepEqual([...s.getCell(2 * 9).possible], [7, 8]);
});

test('nakedPairs should not change anything upon finding ("1", "2", "5") across two cells', t => {
	const s = new Sudoku();

	const possibles = [
		[1, 2, 5], // #1
		[6, 7, 8, 3],
		[1, 4, 6, 9],
		[1, 2, 5], // #2
		[1, 2, 5, 6],
		[4, 5, 9],
		[1, 5, 7, 8],
		[3, 5, 7],
		[1, 4, 8],
	];

	const row = s.getRow(3);

	for (let index = 0; index < 9; ++index) {
		row[index]!.possible = new Set(possibles[index]);
	}

	nakedPairs(s);
	t.false(s.anyChanged);

	for (let index = 0; index < 9; ++index) {
		t.deepEqual([...row[index]!.possible], possibles[index]!);
	}
});

test('nakedPairs should find an incomplete naked pair', t => {
	const s = new Sudoku();

	// The naked pair is [1, 2, 4]

	const possibles = [
		[1, 2, 4], // #1
		[1, 2, 4], // #2
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 4], // #3, missing 2, though
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
	];

	const block = s.getBlock(0);
	for (const [i, possible] of possibles.entries()) {
		block[i]!.possible = new Set(possible);
	}

	nakedPairs(s);

	t.deepEqual(
		block.map(({possible}) => [...possible]),
		[
			[1, 2, 4], // #1
			[1, 2, 4], // #2
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
			[1, 4], // #3
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
		],
	);
});

test('nakedPairs should find an incomplete naked pair with incomplete cell as first', t => {
	const s = new Sudoku();

	// The naked pair is [1, 2, 4]

	const possibles = [
		[1, 4], // #1, missing 2, though
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 4], // #2
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 4], // #3
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
	];

	const block = s.getBlock(0);
	for (const [i, possible] of possibles.entries()) {
		block[i]!.possible = new Set(possible);
	}

	nakedPairs(s);

	t.deepEqual(
		block.map(({possible}) => [...possible]),
		[
			[1, 4], // #1
			[3, 5, 6, 7, 8, 9],
			[1, 2, 4], // #2
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
			[1, 2, 4], // #3
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
		],
	);
});

test('nakedPairs should find an incomplete naked pair with multiple incomplete cells', t => {
	const s = new Sudoku();

	// The naked pair is [1, 2, 4]

	const possibles = [
		[1, 4], // #1, missing 2
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2], // #2, missing 4
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[2, 4], // #3, missing 1
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
	];

	const block = s.getBlock(0);
	for (const [i, possible] of possibles.entries()) {
		block[i]!.possible = new Set(possible);
	}

	nakedPairs(s);

	t.deepEqual(
		block.map(({possible}) => [...possible]),
		[
			[1, 4], // #1
			[3, 5, 6, 7, 8, 9],
			[1, 2], // #2
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
			[2, 4], // #3
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
			[3, 5, 6, 7, 8, 9],
		],
	);
});

test('nakedPairs with incomplete cells that do not overlap much', t => {
	const s = new Sudoku();

	// The naked pair is [1, 2, 4]

	const possibles = [
		[1, 4], // #1, missing 2, 3; doesn't overlap with #2
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[2, 3], // #2, missing 1, 4
		[1, 3], // #3, missing 2, 4
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[2, 4], // #4, missing 1, 3
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
		[1, 2, 3, 4, 5, 6, 7, 8, 9],
	];

	const block = s.getBlock(0);
	for (const [i, possible] of possibles.entries()) {
		block[i]!.possible = new Set(possible);
	}

	nakedPairs(s);

	t.deepEqual(
		block.map(({possible}) => [...possible]),
		[
			[1, 4], // #1
			[5, 6, 7, 8, 9],
			[2, 3], // #2
			[1, 3], // #3
			[5, 6, 7, 8, 9],
			[2, 4], // #4
			[5, 6, 7, 8, 9],
			[5, 6, 7, 8, 9],
			[5, 6, 7, 8, 9],
		],
	);
});
