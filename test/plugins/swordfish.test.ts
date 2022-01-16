import test, {ExecutionContext} from 'ava';
import {swordfish} from '../../src/plugins/swordfish.js';
import {Sudoku} from '../../src/sudoku.js';

const makeCheck
	= (s: Sudoku, t: ExecutionContext) =>
	(index: number, expected: number[] | number): void => {
		const cell = s.getCell(index);

		if (Array.isArray(expected)) {
			t.deepEqual(s.getCell(index).possible, new Set(expected));
		} else {
			t.is(cell.content, expected);
			t.is(cell.possible.size, 0);
		}
	};

test('regular swordfish #1', t => {
	const s = new Sudoku();
	const check = makeCheck(s, t);

	const layout: Array<Array<number | number[]>> = [
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

test('regular swordfish #2', t => {
	const s = new Sudoku();
	const check = makeCheck(s, t);

	const layout: Array<Array<number | number[]>> = [
		[[5, 6], [3, 5, 6], 2, [3, 4], 8, 1, [4, 5], 9, 7],
		[7, [3, 5], 1, 6, 9, [3, 4], 2, [4, 5], 8],
		[9, 8, 4, 5, 2, 7, 6, 3, 1],
		[4, 2, 5, 1, 3, 8, 9, 7, 6],
		[3, 7, 6, 9, 5, 2, 1, 8, 4],
		[8, 1, 9, 7, 4, 6, 3, [2, 5], [2, 5]],
		[[1, 6], [6, 9], 3, 8, 7, [4, 5], [4, 5], [1, 2], [2, 9]],
		[2, [4, 5], 8, [3, 4], 1, 9, 7, 6, [3, 5]],
		[[1, 5], [4, 5, 9], 7, 2, 6, [3, 4, 5], 8, [1, 4, 5], [3, 5, 9]],
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

	check(0 * 9 + 1, [3, 6]);

	check(1 * 9 + 1, [3, 5]);
	check(1 * 9 + 7, [4, 5]);
	check(1 * 9 + 8, 8);

	check(5 * 9 + 1, 1);
	check(5 * 9 + 7, [2, 5]);
	check(5 * 9 + 8, [2, 5]);

	check(7 * 9 + 1, [4, 5]);
	check(7 * 9 + 7, 6);
	check(7 * 9 + 8, [3, 5]);

	check(8 * 9 + 1, [4, 9]);
	check(8 * 9 + 7, [1, 4]);
	check(8 * 9 + 8, [3, 9]);
});

test('Swordfish with little intersecting', t => {
	const s = new Sudoku();
	const check = makeCheck(s, t);

	const layout: Array<Array<number | number[]>> = [
		[[1], 3, 3, [1], 3, 3, 3, 3, 3],
		// ^         ^
		[3, [1], [1], 3, 3, 3, 3, 3, 3],
		//   ^    ^
		[[1], 3, [1], 3, 3, 3, 3, 3, 3],
		// ^      ^
		[3, [1], 3, [1], 3, 3, 3, 3, 3],
		//   ^       ^
		[[1, 2], [1, 2], [1, 2], [1, 2], 3, 3, 3, [1, 2], 3],
		// ^      ^       ^       ^ remove all     ^ leave this
		...Array.from({length: 4}, () => Array.from({length: 9}, () => 3)),
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

	check(0 * 9 + 0, [1]);
	check(0 * 9 + 3, [1]);

	check(1 * 9 + 1, [1]);
	check(1 * 9 + 2, [1]);

	check(2 * 9 + 0, [1]);
	check(2 * 9 + 2, [1]);

	check(3 * 9 + 1, [1]);
	check(3 * 9 + 3, [1]);

	check(4 * 9 + 0, 2);
	check(4 * 9 + 1, 2);
	check(4 * 9 + 2, 2);
	check(4 * 9 + 3, 2);
	check(4 * 9 + 7, [1, 2]);
});
