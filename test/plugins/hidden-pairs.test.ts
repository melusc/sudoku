import test from 'ava';

import {hiddenPairs} from '../../src/plugins/hidden-pairs.js';
import {Sudoku} from '../../src/sudoku.js';

import {getComparableCells} from './helpers.js';

const _ = undefined;
test('hiddenPairs should find the hidden pairs ("3", "4", "0").', t => {
	const s = Sudoku.fromPrefilled(
		[
			_,
			_,
			_,
			_,
			[
				[3, 4, 6, 8, 0], // #1
				[1, 5, 7, 8],
				[1, 2, 5, 7],
				[1, 3, 4, 5, 7, 8, 0], // #2
				[5, 7, 8],
				[2, 3, 4, 5, 6, 0], // #3
				[1, 6, 7, 8],
				[1, 6, 7, 8],
				[2, 5, 6, 8],
			],
		],
		9,
	);

	hiddenPairs(s);

	const wantedSet = new Set([3, 4, 0]);

	t.deepEqual(s.getCell(4 * 9).candidates, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 3).candidates, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 5).candidates, wantedSet);
});

test('hiddenPairs should find the only cell that can have "1".', t => {
	const s = Sudoku.fromPrefilled(
		[
			[
				[2, 3, 5, 7, 0],
				[3, 5, 6, 8],
				[3, 4],
				[1, 4, 2], // Only cell that can have a "1"
				[3, 4, 6, 7, 0],
				[2, 4, 5, 6, 0],
				[4, 5, 8, 0],
				[2, 5, 7, 0],
				[2, 6, 8, 0],
			],
		],
		9,
	);

	hiddenPairs(s);

	const cell = s.getCell(3);
	t.is(cell.element, 1);
	t.is(cell.candidates.size, 0);
});

test("hiddenPairs should not modify any cells if there aren't any hidden pairs.", t => {
	// Two cells can have a "1"
	const candidates = [
		[2, 3, 5, 7, 0],
		[3, 5, 6, 8],
		[1, 3, 4],
		[1, 4, 2],
		[3, 4, 6, 7, 0],
		[2, 4, 5, 6, 0],
		[4, 5, 8, 0],
		[2, 5, 7, 0],
		[2, 6, 8, 0],
	];

	const unmodifiedSudoku = Sudoku.fromPrefilled([candidates], 9);
	const s = Sudoku.fromPrefilled([candidates], 9);

	hiddenPairs(s);

	t.deepEqual(getComparableCells(s), getComparableCells(unmodifiedSudoku));
});

test('hiddenPairs should find an incomplete hidden pair', t => {
	// The hidden pair is [7, 8, 9]
	const s = Sudoku.fromPrefilled(
		[
			[
				[1, 2, 3, 4, 5, 6, 7, 8], // #1, missing 9, though
				[1, 2, 3, 4, 5, 6, 7, 8, 0], // #2
				[1, 2, 3, 4, 5, 6],
				[1, 2, 3, 4, 5, 6],
				[1, 2, 3, 4, 5, 6, 7, 8, 0], // #3
				[1, 2, 3, 4, 5, 6],
				[1, 2, 3, 4, 5, 6],
				[1, 2, 3, 4, 5, 6],
				[1, 2, 3, 4, 5, 6],
			],
		],
		9,
	);

	hiddenPairs(s);
	t.true(s.anyChanged);

	t.deepEqual(
		s.getRow(0).map(({candidates}) => [...candidates]),
		[
			[7, 8],
			[7, 8, 0],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[7, 8, 0],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
			[1, 2, 3, 4, 5, 6],
		],
	);
});

test('hiddenPairs should find the hidden pairs ("3", "4", "0") by ignoring "5".', t => {
	/*
	  It might see (3, 4, 5, 0) in #1..3, but it should know
		that 5 already is a number in the structure and
		should therefore ignore it, leaving (3, 4, 0)
	*/

	const s = Sudoku.fromPrefilled(
		[
			_,
			_,
			_,
			_,
			[
				[3, 4, 5, 6, 8, 0], // #1
				[1, 5, 7, 8],
				5,
				[1, 3, 4, 5, 7, 8, 0], // #2
				[5, 7, 8],
				[2, 3, 4, 5, 6, 0], // #3
				[1, 6, 7, 8],
				[1, 6, 7, 8],
				[2, 5, 6, 8],
			],
		],
		9,
	);

	hiddenPairs(s);

	const wantedSet = new Set([3, 4, 0]);

	t.deepEqual(s.getCell(4 * 9).candidates, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 3).candidates, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 5).candidates, wantedSet);
});
