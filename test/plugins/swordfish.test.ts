import test from 'ava';
import {FixedLengthArray} from 'type-fest';
import {swordfish} from '../../src/plugins/swordfish.js';
import {Sudoku} from '../../src/sudoku.js';

test('regular swordfish', t => {
	const s = new Sudoku();

	const layout: FixedLengthArray<FixedLengthArray<number | number[], 9>, 9> = [
		[4, [1, 6], 2, [1, 7], 5, 3, 8, 9, [1, 7, 6]],
		[[1, 7], 8, 3, 4, 9, 6, [1, 7], 2, 5],
		// ^                     ^
		[[1, 6, 7], 5, 9, [1, 2], 8, [2, 7], 4, 3, [1, 6]],
		[[1, 3, 6], [1, 6], 5, 9, 4, [2, 7], [1, 3, 7], 8, [1, 2]],
		[2, 7, 8, 6, [1, 3], 5, [1, 3], 4, 9],
		//            ^          ^
		[[1, 3], 9, 4, [2, 7], [1, 3], 8, 5, 6, [2, 7]],
		// ^                    ^
		[5, 4, 6, 3, 7, 9, 2, 1, 8],
		[8, 2, 1, 5, 6, 4, 9, 7, 3],
		[9, 3, 7, 8, 2, 1, 6, 5, 4],
	];

	for (const [rowIndex, row] of layout.entries()) {
		const sRow = s.getRow(rowIndex);
		for (const [colIndex, cell] of row.entries()) {
			if (Array.isArray(cell)) {
				sRow[colIndex]!.possible = new Set(cell);
			} else {
				sRow[colIndex]!.setContent(cell);
			}
		}
	}

	swordfish(s);
	t.true(s.anyChanged);

	const check = (index: number, expected: number[]): void => {
		const cell = s.getCell(index);

		if (expected.length === 1) {
			t.is(cell.content, expected[0]!);
			t.is(cell.possible.size, 0);
		} else {
			t.deepEqual(s.getCell(index).possible, new Set(expected));
		}
	};

	check(1 * 9 + 0, [1, 7]); // was 1, 7
	check(2 * 9 + 0, [6, 7]); // was 1, 6, 7
	check(3 * 9 + 0, [3, 6]); // was 1, 3, 6
	check(5 * 9 + 0, [1, 3]); // was 1, 3

	check(4 * 9 + 4, [1, 3]); // was 1, 3
	check(5 * 9 + 4, [1, 3]); // was 1, 3

	check(1 * 9 + 6, [1, 7]); // was 1, 7
	check(3 * 9 + 6, [3, 7]); // was 1, 3, 7
	check(4 * 9 + 6, [1, 3]); // was 1, 7
});

test('finned swordfish', t => {
	const s = new Sudoku();

	const layout: FixedLengthArray<FixedLengthArray<number | number[], 9>, 9> = [
		[1, [3, 7, 8], [3, 6, 7, 8], 5, [3, 6, 8], 4, 9, 2, [6, 7]],
		[[3, 8], 5, [3, 6, 7, 8], [2, 3, 6, 8], 9, [2, 3, 6, 8], 4, [6, 7, 8], 1],
		[4, 9, 2, [1, 6, 8], 7, [1, 6, 8], 3, [6, 8], 5],
		[9, 4, [3, 7], [1, 2, 7], [3, 5, 6], [1, 2, 7], [1, 5], [3, 6], 8],
		[2, 1, 5, [3, 6, 8], 4, [3, 6, 8], 7, 9, [3, 6]],
		[6, [3, 7, 8], [3, 7, 8], 9, [3, 5], [1, 7], [1, 5], 4, 2],
		[[3, 8], [3, 8], 1, 4, 2, [5, 7], 6, [5, 7], 9],
		[7, [2, 6], 9, [3, 6, 8], 1, [3, 5, 6, 8], [2, 8], [3, 5], 4],
		[5, [2, 6], 4, [3, 6, 7, 8], [3, 6, 8], 9, [2, 8], 1, [3, 7]],
	];

	for (const [rowIndex, row] of layout.entries()) {
		const sRow = s.getRow(rowIndex);
		for (const [colIndex, cell] of row.entries()) {
			if (Array.isArray(cell)) {
				sRow[colIndex]!.possible = new Set(cell);
			} else {
				sRow[colIndex]!.setContent(cell);
			}
		}
	}

	swordfish(s);
	t.true(s.anyChanged);

	const check = (index: number, expected: number[]): void => {
		const cell = s.getCell(index);

		if (expected.length === 1) {
			t.is(cell.content, expected[0]!);
			t.is(cell.possible.size, 0);
		} else {
			t.deepEqual(s.getCell(index).possible, new Set(expected));
		}
	};

	check(1 * 9 + 2, [3, 6, 7, 8]);
	check(1 * 9 + 7, [6, 7, 8]);

	check(3 * 9 + 2, [3, 7]);
	check(3 * 9 + 4, [1, 2, 7]);
	check(3 * 9 + 5, [1, 2, 7]);

	check(5 * 9 + 5, [1]);

	check(6 * 9 + 5, [5, 7]);
	check(6 * 9 + 7, [5, 7]);
});
