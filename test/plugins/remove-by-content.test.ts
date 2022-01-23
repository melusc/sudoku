import test from 'ava';
import {Sudoku} from '../../src/sudoku.js';
import {removeByContent} from '../../src/plugins/remove-by-content.js';
import {getComparableCells} from './helpers.js';

const _ = undefined;

test('removeByContent should not change an empty sudoku', t => {
	const originalSudoku = new Sudoku();
	const modifiedSudoku = new Sudoku();

	removeByContent(modifiedSudoku);
	t.false(modifiedSudoku.anyChanged);

	t.deepEqual(
		getComparableCells(modifiedSudoku),
		getComparableCells(originalSudoku),
	);
});

test('removeByContent should solve [[1, 2, 3], [4, 5, 6], [_, 8, 9] (block) correctly.', t => {
	const s = Sudoku.fromPrefilled([
		[1, 2, 3],
		[4, 5, 6],
		[_, 8, 9],
	]);

	removeByContent(s);

	const cell = s.getCell(2 * 9);
	t.is(cell.content, 7);
	t.is(cell.candidates.size, 0);
});

test('removeByContent should nearly solve [[1, 2, 3], [_, _, 6], [7, 8, 9]] (block).', t => {
	const sudoku = Sudoku.fromPrefilled([
		[1, 2, 3],
		[_, _, 6],
		[7, 8, 9],
	]);

	removeByContent(sudoku);

	const cell1 = sudoku.getCell(1 * 9);
	const cell2 = sudoku.getCell(1 * 9 + 1);

	t.deepEqual(cell1.candidates, new Set([4, 5]));

	t.deepEqual(cell2.candidates, new Set([4, 5]));
});

test('removeByContent should solve [_, 2, 5, 3, 8, 9, 4, 7, 6] (col) correctly.', t => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 2, 5, 3, 8, 9, 4, 7, 6].map(item => [item]),
	);

	removeByContent(sudoku);

	const cell = sudoku.getCell(0);
	t.is(cell.content, 1);
	t.is(cell.candidates.size, 0);
});

test('removeByContent should nearly solve [_, 5, 4, 3, 2, 7, 1, 8, _] (row).', t => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 5, 4, 3, 2, 7, 1, 8, _].map(item => [item]),
	);

	removeByContent(sudoku);

	const cell1 = sudoku.getCell(0);
	const cell2 = sudoku.getCell(8 * 9);

	t.deepEqual(cell1.candidates, new Set([6, 9]));

	t.deepEqual(cell2.candidates, new Set([6, 9]));
});

test('removeByContent should solve [1, 2, 3, _, 5, 6, 7, 8, 9] (row) correctly.', t => {
	const sudoku = Sudoku.fromPrefilled([[1, 2, 3, _, 5, 6, 7, 8, 9]]);

	removeByContent(sudoku);

	const cell = sudoku.getCell(3);

	t.is(cell.content, 4);
	t.is(cell.candidates.size, 0);
});

test('removeByContent should nearly solve [5, 7, 8, 1, 2, _, 3, _, 6].', t => {
	const sudoku = Sudoku.fromPrefilled([[5, 7, 8, 1, 2, _, 3, _, 6]]);

	removeByContent(sudoku);

	const cell1 = sudoku.getCell(5);
	const cell2 = sudoku.getCell(7);

	t.deepEqual(cell1.candidates, new Set([4, 9]));

	t.deepEqual(cell2.candidates, new Set([4, 9]));
});
