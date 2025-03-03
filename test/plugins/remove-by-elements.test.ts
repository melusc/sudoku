// eslint-disable-next-line n/no-unsupported-features/node-builtins
import test, {type TestContext} from 'node:test';

import {removeByElements} from '../../src/plugins/remove-by-elements.ts';
import {Sudoku} from '../../src/sudoku.ts';

import {getComparableCells} from './helpers.ts';

const _ = undefined;

await test('removeByElements should not change an empty sudoku', (t: TestContext) => {
	const originalSudoku = new Sudoku(9);
	const modifiedSudoku = new Sudoku(9);

	removeByElements(modifiedSudoku);
	t.assert.ok(!modifiedSudoku.anyChanged);

	t.assert.deepEqual(
		getComparableCells(modifiedSudoku),
		getComparableCells(originalSudoku),
	);
});

await test('removeByElements should solve [[1, 2, 3], [4, 5, 6], [_, 8, 9] (block) correctly.', (t: TestContext) => {
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
	t.assert.equal(cell.element, 7);
	t.assert.equal(cell.candidates.size, 0);
});

await test('removeByElements should nearly solve [[1, 2, 3], [_, _, 6], [7, 8, 9]] (block).', (t: TestContext) => {
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

	t.assert.deepEqual(cell1.candidates, new Set([4, 5]));

	t.assert.deepEqual(cell2.candidates, new Set([4, 5]));
});

await test('removeByElements should solve [_, 2, 5, 3, 8, 9, 4, 7, 6] (col) correctly.', (t: TestContext) => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 2, 5, 3, 8, 0, 4, 7, 6].map(item => [item]),
		9,
	);

	removeByElements(sudoku);

	const cell = sudoku.getCell(0);
	t.assert.equal(cell.element, 1);
	t.assert.equal(cell.candidates.size, 0);
});

await test('removeByElements should nearly solve [_, 5, 4, 3, 2, 7, 1, 8, _] (row).', (t: TestContext) => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 5, 4, 3, 2, 7, 1, 8, _].map(item => [item]),
		9,
	);

	removeByElements(sudoku);

	const cell1 = sudoku.getCell(0);
	const cell2 = sudoku.getCell(8 * 9);

	t.assert.deepEqual(cell1.candidates, new Set([0, 6]));

	t.assert.deepEqual(cell2.candidates, new Set([0, 6]));
});

await test('removeByElements should solve [1, 2, 3, _, 5, 6, 7, 8, 9] (row) correctly.', (t: TestContext) => {
	const sudoku = Sudoku.fromPrefilled([[1, 2, 3, _, 5, 6, 7, 8, 0]], 9);

	removeByElements(sudoku);

	const cell = sudoku.getCell(3);

	t.assert.equal(cell.element, 4);
	t.assert.equal(cell.candidates.size, 0);
});

await test('removeByElements should nearly solve [5, 7, 8, 1, 2, _, 3, _, 6].', (t: TestContext) => {
	const sudoku = Sudoku.fromPrefilled([[5, 7, 8, 1, 2, _, 3, _, 6]], 9);

	removeByElements(sudoku);

	const cell1 = sudoku.getCell(5);
	const cell2 = sudoku.getCell(7);

	t.assert.deepEqual(cell1.candidates, new Set([0, 4]));

	t.assert.deepEqual(cell2.candidates, new Set([0, 4]));
});
