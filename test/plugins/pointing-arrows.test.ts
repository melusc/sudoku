import test from 'ava';

import {pointingArrows} from '../../src/plugins/pointing-arrows.js';
import {Sudoku} from '../../src/sudoku.js';

import {getComparableCells} from './helpers.js';

test('pointingArrows should not change an empty sudoku.', t => {
	const s = new Sudoku();

	const unchanged = getComparableCells(s);

	pointingArrows(s);
	t.false(s.anyChanged);

	t.deepEqual(getComparableCells(s), unchanged);
});

test('pointingArrows should find a pointing arrow of 3s.', t => {
	const s = new Sudoku();

	const layout: Array<Array<number | number[]>> = [
		[[2, 4, 5, 8], 1, 7, 9, [2, 4, 5], 3, 6, [4, 8], [2, 4, 8]],
		[
			[2, 3, 4, 5, 6], // Remove "3" from here
			[2, 3, 4, 5], // And here
			[3, 6], // And here
			[1, 2, 5, 7],
			8,
			[5, 7],
			[1, 3, 9], // Pointing arrow here
			[1, 4, 9],
			[1, 2, 3, 4, 9], // And here
		],
		[9, [2, 3, 4, 8], [3, 6, 8], [1, 2], [2, 4, 6], [4, 6], 5, [1, 4, 8], 7],
	];

	for (const [rowIndex, row] of layout.entries()) {
		for (const [colIndex, wantedCell] of row.entries()) {
			if (Array.isArray(wantedCell)) {
				s.getCell(rowIndex * 9 + colIndex).possible = new Set(wantedCell);
			} else {
				s.setContent(rowIndex * 9 + colIndex, String(wantedCell));
			}
		}
	}

	pointingArrows(s);
	t.true(s.anyChanged);

	t.deepEqual([...s.getCell(9).possible], [2, 4, 5, 6]);

	t.deepEqual([...s.getCell(10).possible], [2, 4, 5]);

	const cell11 = s.getCell(11);
	t.is(cell11.content, 6);
	t.is(cell11.possible.size, 0);
});

test('pointingArrows should find a pointing arrow of 2s.', t => {
	const s = new Sudoku();

	const layout: Array<Array<number | number[]>> = [
		[
			7,
			[2, 3, 4, 8, 9], // Remove "2" from here
			1,
			[2, 8], // Pointing arrow here
			[2, 4, 9], // And here
			[4, 8, 9],
			[3, 8, 9],
			6,
			5,
		],
		[
			[2, 4, 6, 8],
			[2, 4, 8, 9],
			[6, 8, 9],
			[5, 7],
			3,
			[5, 7, 8],
			[1, 8, 9],
			[1, 4, 8, 9],
			[1, 4, 8, 9],
		],
		[[3, 4, 8], [3, 4, 8, 9], 5, 6, [4, 9], 1, 7, 2, [3, 4, 8, 9]],
	];

	for (const [rowIndex, row] of layout.entries()) {
		for (const [colIndex, wantedCell] of row.entries()) {
			if (Array.isArray(wantedCell)) {
				s.getCell(rowIndex * 9 + colIndex).possible = new Set(wantedCell);
			} else {
				s.setContent(rowIndex * 9 + colIndex, String(wantedCell));
			}
		}
	}

	pointingArrows(s);
	t.true(s.anyChanged);

	t.deepEqual([...s.getCell(1).possible], [3, 4, 8, 9]);
});
