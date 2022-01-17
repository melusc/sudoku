import test from 'ava';

import {Sudoku} from '../../src/sudoku.js';
import {hiddenPairs} from '../../src/plugins/hidden-pairs.js';

import {getComparableCells} from './helpers.js';

const _ = undefined;
test('hiddenPairs should find the hidden pairs ("3", "4", "9").', t => {
	const s = Sudoku.fromPrefilled([
		_,
		_,
		_,
		_,
		[
			[3, 4, 6, 8, 9], // #1
			[1, 5, 7, 8],
			[1, 2, 5, 7],
			[1, 3, 4, 5, 7, 8, 9], // #2
			[5, 7, 8],
			[2, 3, 4, 5, 6, 9], // #3
			[1, 6, 7, 8],
			[1, 6, 7, 8],
			[2, 5, 6, 8],
		],
	]);

	hiddenPairs(s);

	const wantedSet = new Set([3, 4, 9]);

	t.deepEqual(s.getCell(4 * 9).possible, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 3).possible, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 5).possible, wantedSet);
});

test('hiddenPairs should find the only cell that can have "1".', t => {
	const s = Sudoku.fromPrefilled([
		[
			[2, 3, 5, 7, 9],
			[3, 5, 6, 8],
			[3, 4],
			[1, 4, 2], // Only cell that can have a "1"
			[3, 4, 6, 7, 9],
			[2, 4, 5, 6, 9],
			[4, 5, 8, 9],
			[2, 5, 7, 9],
			[2, 6, 8, 9],
		],
	]);

	hiddenPairs(s);

	const cell = s.getCell(3);
	t.is(cell.content, 1);
	t.is(cell.possible.size, 0);
});

test("hiddenPairs should not modify any cells if there aren't any hidden pairs.", t => {
	// Two cells can have a "1"
	const possibles = [
		[2, 3, 5, 7, 9],
		[3, 5, 6, 8],
		[1, 3, 4],
		[1, 4, 2],
		[3, 4, 6, 7, 9],
		[2, 4, 5, 6, 9],
		[4, 5, 8, 9],
		[2, 5, 7, 9],
		[2, 6, 8, 9],
	];

	const unmodifiedSudoku = Sudoku.fromPrefilled([possibles]);
	const s = Sudoku.fromPrefilled([possibles]);

	hiddenPairs(s);

	t.deepEqual(getComparableCells(s), getComparableCells(unmodifiedSudoku));
});

test('hiddenPairs should find an incomplete hidden pair', t => {
	// The hidden pair is [7, 8, 9]
	const s = Sudoku.fromPrefilled([
		[
			[1, 2, 3, 4, 5, 6, 7, 8], // #1, missing 9, though
			[1, 2, 3, 4, 5, 6, 7, 8, 9], // #2
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6, 7, 8, 9], // #3
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
		],
	]);

	hiddenPairs(s);
	t.true(s.anyChanged);

	t.deepEqual(
		s.getRow(0).map(({possible}) => [...possible]),
		[
			[7, 8],
			[7, 8, 9],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[7, 8, 9],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
		],
	);
});
