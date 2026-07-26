/*!
 * This file is part of @lusc/sudoku, a sudoku solver.
 * Copyright (C) 2026, Luca Schnellmann <oss@lusc.ch>

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {removeByElements} from '../../src/plugins/remove-by-elements.js';
import {Sudoku} from '../../src/sudoku.js';

// eslint-disable-next-line node-test/no-import-test-files
import {getComparableCells} from './helpers.js';

const _ = undefined;

await test('removeByElements should not change an empty sudoku', () => {
	const originalSudoku = new Sudoku(9);
	const modifiedSudoku = new Sudoku(9);

	removeByElements(modifiedSudoku);
	assert.ok(!modifiedSudoku.anyChanged);

	assert.deepEqual(
		getComparableCells(modifiedSudoku),
		getComparableCells(originalSudoku),
	);
});

await test('removeByElements should solve [[1, 2, 3], [4, 5, 6], [_, 8, 9] (block) correctly.', () => {
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
	assert.equal(cell.element, 7);
	assert.equal(cell.candidates.size, 0);
});

await test('removeByElements should nearly solve [[1, 2, 3], [_, _, 6], [7, 8, 9]] (block).', () => {
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

	assert.deepEqual(cell1.candidates, new Set([4, 5]));

	assert.deepEqual(cell2.candidates, new Set([4, 5]));
});

await test('removeByElements should solve [_, 2, 5, 3, 8, 9, 4, 7, 6] (col) correctly.', () => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 2, 5, 3, 8, 0, 4, 7, 6].map(item => [item]),
		9,
	);

	removeByElements(sudoku);

	const cell = sudoku.getCell(0);
	assert.equal(cell.element, 1);
	assert.equal(cell.candidates.size, 0);
});

await test('removeByElements should nearly solve [_, 5, 4, 3, 2, 7, 1, 8, _] (row).', () => {
	const sudoku = Sudoku.fromPrefilled(
		[_, 5, 4, 3, 2, 7, 1, 8, _].map(item => [item]),
		9,
	);

	removeByElements(sudoku);

	const cell1 = sudoku.getCell(0);
	const cell2 = sudoku.getCell(8 * 9);

	assert.deepEqual(cell1.candidates, new Set([0, 6]));

	assert.deepEqual(cell2.candidates, new Set([0, 6]));
});

await test('removeByElements should solve [1, 2, 3, _, 5, 6, 7, 8, 9] (row) correctly.', () => {
	const sudoku = Sudoku.fromPrefilled([[1, 2, 3, _, 5, 6, 7, 8, 0]], 9);

	removeByElements(sudoku);

	const cell = sudoku.getCell(3);

	assert.equal(cell.element, 4);
	assert.equal(cell.candidates.size, 0);
});

await test('removeByElements should nearly solve [5, 7, 8, 1, 2, _, 3, _, 6].', () => {
	const sudoku = Sudoku.fromPrefilled([[5, 7, 8, 1, 2, _, 3, _, 6]], 9);

	removeByElements(sudoku);

	const cell1 = sudoku.getCell(5);
	const cell2 = sudoku.getCell(7);

	assert.deepEqual(cell1.candidates, new Set([0, 4]));

	assert.deepEqual(cell2.candidates, new Set([0, 4]));
});
