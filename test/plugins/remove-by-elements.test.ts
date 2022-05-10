import test from 'ava';
import {Sudoku} from '../../src/sudoku.js';
import {removeByElements} from '../../src/plugins/remove-by-elements.js';
import {getComparableCells} from './helpers.js';

const _ = undefined;

test('removeByElements should not change an empty sudoku', t => {
	const originalSudoku = new Sudoku(9);
	const modifiedSudoku = new Sudoku(9);

	removeByElements(modifiedSudoku);
	t.false(modifiedSudoku.anyChanged);

	t.deepEqual(
		getComparableCells(modifiedSudoku),
		getComparableCells(originalSudoku),
	);
});

test('removeByElements should solve [[1, 2, 3], [4, 5, 6], [_, 8, 9] (block) correctly.', t => {
	const s = Sudoku.fromPrefilled(
		[
			[1, 2, 3],
			[4, 5, 6],
			[_, 8, 0],
		],
		9,
	);

	removeByElements(s);

	const cell = s.getCell(2 * 9);
	t.is(cell.element, 7);
	t.is(cell.candidates.size, 0);
});

test('removeByElements should nearly solve [[1, 2, 3], [_, _, 6], [7, 8, 9]] (block).', t => {
	const sudoku = Sudoku.fromPrefilled(
		[
			[1, 2, 3],
			[_, _, 6],
			[7, 8, 0],
		],
		9,
	);

	removeByElements(sudoku);

	const cell1 = sudoku.getCell(1 * 9);
	const cell2 = sudoku.getCell(1 * 9 + 1);

	t.deepEqual(cell1.candidates, new Set([4, 5]));

	t.deepEqual(cell2.candidates, new Set([4, 5]));
});

test('removeByElements should solve [_, 2, 5, 3, 8, 9, 4, 7, 6] (col) correctly.', t => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 2, 5, 3, 8, 0, 4, 7, 6].map(item => [item]),
		9,
	);

	removeByElements(sudoku);

	const cell = sudoku.getCell(0);
	t.is(cell.element, 1);
	t.is(cell.candidates.size, 0);
});

test('removeByElements should nearly solve [_, 5, 4, 3, 2, 7, 1, 8, _] (row).', t => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 5, 4, 3, 2, 7, 1, 8, _].map(item => [item]),
		9,
	);

	removeByElements(sudoku);

	const cell1 = sudoku.getCell(0);
	const cell2 = sudoku.getCell(8 * 9);

	t.deepEqual(cell1.candidates, new Set([0, 6]));

	t.deepEqual(cell2.candidates, new Set([0, 6]));
});

test('removeByElements should solve [1, 2, 3, _, 5, 6, 7, 8, 9] (row) correctly.', t => {
	const sudoku = Sudoku.fromPrefilled([[1, 2, 3, _, 5, 6, 7, 8, 0]], 9);

	removeByElements(sudoku);

	const cell = sudoku.getCell(3);

	t.is(cell.element, 4);
	t.is(cell.candidates.size, 0);
});

test('removeByElements should nearly solve [5, 7, 8, 1, 2, _, 3, _, 6].', t => {
	const sudoku = Sudoku.fromPrefilled([[5, 7, 8, 1, 2, _, 3, _, 6]], 9);

	removeByElements(sudoku);

	const cell1 = sudoku.getCell(5);
	const cell2 = sudoku.getCell(7);

	t.deepEqual(cell1.candidates, new Set([0, 4]));

	t.deepEqual(cell2.candidates, new Set([0, 4]));
});
