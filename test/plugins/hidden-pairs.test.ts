import test from 'ava';

import {Sudoku} from '../../src/sudoku.js';
import {hiddenPairs} from '../../src/plugins/hidden-pairs.js';

import {getComparableCells} from './helpers.js';

test('hiddenPairs should find the hidden pairs ("3", "4", "9").', t => {
	const s = new Sudoku();
	const possibles: string[][] = [
		['3', '4', '6', '8', '9'], // #1
		['1', '5', '7', '8'],
		['1', '2', '5', '7'],
		['1', '3', '4', '5', '7', '8', '9'], // #2
		['5', '7', '8'],
		['2', '3', '4', '5', '6', '9'], // #3
		['1', '6', '7', '8'],
		['1', '6', '7', '8'],
		['2', '5', '6', '8'],
	];

	for (const [index, possible] of possibles.entries()) {
		s.getCell(4 * 9 + index).possible = new Set(possible);
	}

	hiddenPairs(s);

	const wantedSet = new Set(['3', '4', '9']);

	t.deepEqual(s.getCell(4 * 9).possible, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 3).possible, wantedSet);

	t.deepEqual(s.getCell(4 * 9 + 5).possible, wantedSet);
});

test('hiddenPairs should find the only cell that can have "1".', t => {
	const s = new Sudoku();

	const possibles = [
		['2', '3', '5', '7', '9'],
		['3', '5', '6', '8'],
		['3', '4'],
		['1', '4', '2'], // Only cell that can have a "1"
		['3', '4', '6', '7', '9'],
		['2', '4', '5', '6', '9'],
		['4', '5', '8', '9'],
		['2', '5', '7', '9'],
		['2', '6', '8', '9'],
	];

	const block = s.getBlock(0);

	for (const [index, possible] of possibles.entries()) {
		block[index]!.possible = new Set(possible);
	}

	hiddenPairs(s);

	t.deepEqual(s.getCell(1 * 9).possible, new Set(['1']));
});

test("hiddenPairs should not modify any cells if there aren't any hidden pairs.", t => {
	const unmodifiedSudoku = new Sudoku();
	const s = new Sudoku();

	// Two cells can have a "1"
	const possibles = [
		['2', '3', '5', '7', '9'],
		['3', '5', '6', '8'],
		['1', '3', '4'],
		['1', '4', '2'],
		['3', '4', '6', '7', '9'],
		['2', '4', '5', '6', '9'],
		['4', '5', '8', '9'],
		['2', '5', '7', '9'],
		['2', '6', '8', '9'],
	];

	const block1 = s.getBlock(0);
	const block2 = unmodifiedSudoku.getBlock(0);

	for (const [index, possible] of possibles.entries()) {
		block1[index]!.possible = new Set(possible);
		block2[index]!.possible = new Set(possible);
	}

	hiddenPairs(s);

	t.deepEqual(getComparableCells(s), getComparableCells(unmodifiedSudoku));
});

test('hiddenPairs should find an incomplete hidden pair', t => {
	const s = new Sudoku();

	// The hidden pair is [7, 8, 9]

	const possibles = [
		['1', '2', '3', '4', '5', '6', '7', '8'], // #1, missing 9, though
		['1', '2', '3', '4', '5', '6', '7', '8', '9'], // #2
		['1', '2', '3', '4', '5', '6'],
		['1', '2', '3', '4', '5', '6'],
		['1', '2', '3', '4', '5', '6', '7', '8', '9'], // #3
		['1', '2', '3', '4', '5', '6'],
		['1', '2', '3', '4', '5', '6'],
		['1', '2', '3', '4', '5', '6'],
		['1', '2', '3', '4', '5', '6'],
	];

	const block = s.getBlock(0);

	for (const [i, possible] of possibles.entries()) {
		block[i]!.possible = new Set(possible);
	}

	hiddenPairs(s);

	t.deepEqual(
		block.map(({possible}) => [...possible]),
		[
			['7', '8', '9'],
			['7', '8', '9'],
			['1', '2', '3', '4', '5', '6'],
			['1', '2', '3', '4', '5', '6'],
			['7', '8', '9'],
			['1', '2', '3', '4', '5', '6'],
			['1', '2', '3', '4', '5', '6'],
			['1', '2', '3', '4', '5', '6'],
			['1', '2', '3', '4', '5', '6'],
		],
	);
});
