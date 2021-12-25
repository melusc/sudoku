import test from 'ava';
import {Sudoku, inRangeIncl} from '../src/sudoku.js';

test('Sudoku should be a class', t => {
	t.is(typeof new Sudoku(), 'object');
});

test('Sudoku#setContent', t => {
	const s = new Sudoku();
	s.setContent(0, '4');

	t.is(s.getContent(0), '4');
});

test('Sudoku#getContent', t => {
	const s = new Sudoku();
	t.is(s.getContent(8 * 9 + 8), undefined);

	s.setContent(8 * 9 + 8, '4');
	t.is(s.getContent(8 * 9 + 8), '4');
});

test('Sudoku#clearCell', t => {
	const s = new Sudoku();
	s.setContent(6 * 9 + 6, '4');
	t.is(s.getContent(6 * 9 + 6), '4');
	s.clearCell(6 * 9 + 6);
	t.is(s.getContent(6 * 9 + 6), undefined);
});

test('Sudoku#clearAllCells', t => {
	const s = new Sudoku();
	s.setContent(6 * 9 + 6, '4')
		.setContent(1 * 9 + 1, '5')
		.setContent(2 * 9 + 4, '3');

	t.is(s.getContent(6 * 9 + 6), '4');
	t.is(s.getContent(1 * 9 + 1), '5');
	t.is(s.getContent(2 * 9 + 4), '3');

	s.clearAllCells();

	t.is(s.getContent(6 * 9 + 6), undefined);
	t.is(s.getContent(1 * 9 + 1), undefined);
	t.is(s.getContent(2 * 9 + 4), undefined);
});

test('Sudoku#getCol', t => {
	const s = new Sudoku();
	s.setContent(2 * 9 + 8, '2').setContent(5 * 9 + 8, '4');

	const col = s.getCol(8);

	t.deepEqual(
		col.map(cell => cell.content),
		[
			undefined,
			undefined,
			'2',
			undefined,
			undefined,
			'4',
			undefined,
			undefined,
			undefined,
		],
	);
});

test('Sudoku#getRow', t => {
	const s = new Sudoku();
	s.setContent(8 * 9 + 8, '3')
		.setContent(8 * 9 + 2, '4')
		.setContent(8 * 9 + 7, '7');

	const row = s.getRow(8);

	t.deepEqual(
		row.map(cell => cell.content),
		[
			undefined,
			undefined,
			'4',
			undefined,
			undefined,
			undefined,
			undefined,
			'7',
			'3',
		],
	);
});

test('Sudoku#getCell', t => {
	const s = new Sudoku();
	t.deepEqual(s.getCell(0), s.getBlock(0)[0]!);

	t.deepEqual(
		s.getCell(4 * 9 + 6),
		// @ts-expect-error sudoku#cells is private
		s.cells[4 * 9 + 6], // This is what it does, but there's not a lot to test here anyway.
	);
});

test('Sudoku#getCells', t => {
	let s = new Sudoku();

	const cells1 = s.getCells();

	t.is(cells1.length, 81);

	for (const cell of cells1) {
		t.is(cell.content, undefined);

		t.is(typeof cell.key, 'string');

		t.is(cell.possible.size, 9);
	}

	// ====

	s = new Sudoku();

	const sudoku = s
		.setContent(0, '2')
		.setContent(1 * 9 + 1, '4')
		.setContent(5 * 9 + 7, '2');

	t.is(sudoku.getCell(0).content, '2');
	t.is(sudoku.getCell(1 * 9 + 1).content, '4');
	t.is(sudoku.getCell(5 * 9 + 7).content, '2');

	// ====

	const firstRow = Array.from({length: 9}, (_v, index) => index + 1);
	s = new Sudoku([firstRow]);

	const cells2 = s.getCells();

	t.deepEqual(
		cells2.map(cell => cell.content).slice(0, 9),
		firstRow.map(cell => `${cell}`),
	);
});

test('Sudoku#getBlock', t => {
	let s = new Sudoku();
	const block1 = s.getBlock(0);

	t.true(Array.isArray(block1));
	t.is(block1.length, 9);

	// ====

	s = new Sudoku();

	for (let row = 0; row < 3; ++row) {
		for (let col = 0; col < 3; ++col) {
			s.setContent(row * 9 + col, `${row * 3 + col + 1}`);
		}
	}

	const block2 = s.getBlock(0);

	for (const [index, element] of block2.entries()) {
		t.is(element.content, `${index + 1}`);
	}
});

// eslint-disable-next-line ava/no-async-fn-without-await
test('Sudoku#solve easy', async t => {
	t.plan(3);

	const _ = undefined;
	const s = new Sudoku([
		[_, 1, _, 3, 8, _, _, 5, 2],
		[_, 6, 5, _, _, _, _, 8, 9],
		[_, _, _, 5, _, 9],
		[_, _, _, 4, 1, _, 8],
		[2, 3, _, _, _, _, _, 4, 6],
		[_, _, 8, _, 3, 7],
		[_, _, _, 1, _, 8],
		[6, 5, _, _, _, _, 2, 3],
		[7, 8, _, _, 5, 3, _, 1],
	]);

	// Return this so if subscribe is ever async
	// it still works
	return new Promise<void>(resolve => {
		s.subscribe((_s, type) => {
			t.true(type === 'finish'); // Get typescript checking

			resolve();
		});

		s.solve();

		t.deepEqual(
			s.getCells().map(cell => cell.content),
			[
				['9', '1', '4', '3', '8', '6', '7', '5', '2'],
				['3', '6', '5', '7', '2', '1', '4', '8', '9'],
				['8', '7', '2', '5', '4', '9', '3', '6', '1'],
				['5', '9', '6', '4', '1', '2', '8', '7', '3'],
				['2', '3', '7', '8', '9', '5', '1', '4', '6'],
				['1', '4', '8', '6', '3', '7', '9', '2', '5'],
				['4', '2', '3', '1', '6', '8', '5', '9', '7'],
				['6', '5', '1', '9', '7', '4', '2', '3', '8'],
				['7', '8', '9', '2', '5', '3', '6', '1', '4'],
			].flat(),
		);

		t.true(s.isSolved());
	});
});

// eslint-disable-next-line ava/no-async-fn-without-await
test('Sudoku#solve evil', async t => {
	t.plan(3);

	const _ = undefined;

	const s = new Sudoku([
		[6, _, 4, _, _, _, _, _, 3],
		[_, _, _, _, 3, 7, 8],
		[_, _, _, 5, _, _, 7],
		[8, 9, _, 1],
		[3, _, _, _, _, _, _, _, 2],
		[_, _, _, _, _, 3, _, 1, 9],
		[_, _, 5, _, _, 9],
		[_, _, 1, 8, 6],
		[9, _, _, _, _, _, 4, _, 8],
	]);

	// Return this so if subscribe is ever async
	// it still works
	return new Promise<void>(resolve => {
		s.subscribe((_s, type) => {
			t.true(type === 'finish'); // Get typescript checking

			resolve();
		});

		s.solve();

		t.deepEqual(
			s.getCells().map(cell => cell.content),
			[
				['6', '7', '4', '9', '2', '8', '1', '5', '3'],
				['1', '5', '9', '6', '3', '7', '8', '2', '4'],
				['2', '3', '8', '5', '4', '1', '7', '9', '6'],
				['8', '9', '6', '1', '5', '2', '3', '4', '7'],
				['3', '1', '7', '4', '9', '6', '5', '8', '2'],
				['5', '4', '2', '7', '8', '3', '6', '1', '9'],
				['4', '8', '5', '3', '7', '9', '2', '6', '1'],
				['7', '2', '1', '8', '6', '4', '9', '3', '5'],
				['9', '6', '3', '2', '1', '5', '4', '7', '8'],
			].flat(),
		);

		t.true(s.isSolved());
	});
});

// eslint-disable-next-line ava/no-async-fn-without-await
test('Sudoku#solve expert', async t => {
	t.plan(3);

	const _ = undefined;

	const s = new Sudoku([
		[_, _, _, _, _, 4, _, _, 2],
		[_, 6, _, 2, _, _, _, 3],
		[_, 8, _, _, _, 3, 5, _, 9],
		[_, 4, _, _, _, _, 1],
		[1, _, _, 7, _, 5],
		[5, _, 3],
		[_, 9, _, 3],
		[_, _, 4, _, 6, 1],
		[_, _, 5, _, _, _, 7],
	]);

	// Return this so if subscribe is ever async
	// it still works
	return new Promise<void>(resolve => {
		s.subscribe((_s, type) => {
			t.true(type === 'finish'); // Get typescript checking

			resolve();
		});

		s.solve();

		t.deepEqual(
			s.getCells().map(cell => cell.content),
			[
				['3', '5', '1', '9', '8', '4', '6', '7', '2'],
				['4', '6', '9', '2', '5', '7', '8', '3', '1'],
				['2', '8', '7', '6', '1', '3', '5', '4', '9'],
				['9', '4', '6', '8', '3', '2', '1', '5', '7'],
				['1', '2', '8', '7', '4', '5', '3', '9', '6'],
				['5', '7', '3', '1', '9', '6', '2', '8', '4'],
				['6', '9', '2', '3', '7', '8', '4', '1', '5'],
				['7', '3', '4', '5', '6', '1', '9', '2', '8'],
				['8', '1', '5', '4', '2', '9', '7', '6', '3'],
			].flat(),
		);

		t.true(s.isSolved());
	});
});

// eslint-disable-next-line ava/no-async-fn-without-await
test('Sudoku#solve: It should realise that invalid1 is invalid', async t => {
	t.plan(2);

	const _ = undefined;

	const s = new Sudoku([
		// Here both 5 and 6 would have to be in the middle/middle cell
		// which is not possible, since only one number can be in each cell
		[],
		[_, _, _, 6],
		[_, _, _, 5],
		[_, _, _, _, _, _, 5, 6],
		[],
		[_, 6, 5],
		[_, _, _, _, _, 5],
		[_, _, _, _, _, 6],
	]);

	return new Promise<void>(resolve => {
		s.subscribe((_s, type) => {
			t.true(type === 'error');

			resolve();
		});

		s.solve();

		t.false(s.isSolved());
	});
});

// eslint-disable-next-line ava/no-async-fn-without-await
test('Sudoku#solve: It should realise that invalid2 is invalid', async t => {
	t.plan(2);

	const _ = undefined;

	const s = new Sudoku([
		// Here 1,2,3 have to be in the third column of the middle/middle block
		// And 4,5,6 have to be in the first row of the middle/middle block
		// Since those two overlap this is an invalid sudoku
		[_, _, _, _, 1],
		[_, _, _, _, 2],
		[_, _, _, _, 3],
		[],
		[4, 5, 6],
		[_, _, _, _, _, _, 4, 5, 6],
		[_, _, _, 1],
		[_, _, _, 2],
		[_, _, _, 3],
	]);

	return new Promise<void>(resolve => {
		s.subscribe((_s, type) => {
			t.true(type === 'error');

			resolve();
		});

		s.solve();

		t.false(s.isSolved());
	});
});

// eslint-disable-next-line ava/no-async-fn-without-await
test('Sudoku#subscribe', async t => {
	const s = new Sudoku();

	t.plan(2);

	// For if subscribe is ever async
	return new Promise<void>(resolve => {
		// 2 tests only, because callback should only fire once

		const callback = (sudoku: Sudoku): void => {
			t.is(sudoku.getCell(3 * 9 + 2).content, '2');
			t.is(sudoku.getCell(4 * 9 + 1).content, '4');

			resolve();
		};

		// Callback won't fire
		s.setContent(3 * 9 + 2, '2');

		s.subscribe(callback);

		// Callback should fire
		s.setContent(4 * 9 + 1, '4');
	});
});

// eslint-disable-next-line ava/no-async-fn-without-await
test('Sudoku#unsubscribe', async t => {
	const s = new Sudoku();

	t.plan(3);

	return new Promise<void>(resolve => {
		// Callback1 will be unsubscribed and as such only fire twice
		// Callback2 will not and as such fire four times

		const callback1 = (): void => {
			t.is(s.getContent(3 * 9 + 2), '2');
		};

		const callback2 = (): void => {
			t.is(s.getContent(3 * 9 + 2), '2');

			if (s.getContent(4 * 9 + 1) === '4') {
				resolve();
			}
		};

		s.subscribe(callback1).subscribe(callback2);

		s.setContent(3 * 9 + 2, '2');

		s.unsubscribe(callback1);

		s.setContent(4 * 9 + 1, '4');
	});
});

test('Sudoku#cellsIndividuallyValidByStructure', t => {
	let s = new Sudoku();

	t.true(s.cellsIndividuallyValidByStructure(), 'Empty sudoku should be valid');

	// ====

	s = new Sudoku();
	s.setContent(2, 'Hello there');
	t.false(
		s.cellsIndividuallyValidByStructure(),
		'A sudoku with an invalid cell should return false',
	);
	s.setContent(2, '2');
	t.true(
		s.cellsIndividuallyValidByStructure(),
		'It should return true after fixing an invalid cell',
	);

	// ====

	s = new Sudoku();
	s.setContent(2, '3').setContent(3, '3');
	t.false(
		s.cellsIndividuallyValidByStructure(),
		'A sudoku with duplicates should return false (1)',
	);
	s.clearCell(3);
	t.true(
		s.cellsIndividuallyValidByStructure(),
		'After clearing the duplicate cell it should return true',
	);

	// ====

	s = new Sudoku();
	s.setContent(2, '3').setContent(3, '3');
	t.false(
		s.cellsIndividuallyValidByStructure(),
		'A sudoku with duplicates should return false (2)',
	);
	s.setContent(3, '4');
	t.true(
		s.cellsIndividuallyValidByStructure(),
		'After overwriting the duplicate cell it should return true',
	);
});

test('Sudoku#isSolved', t => {
	let s = new Sudoku();

	t.false(s.isSolved(), 'An empty sudoku should return false');

	// ====

	s = new Sudoku();
	s.setContent(3, '2').setContent(4, '4');
	t.false(s.isSolved(), 'A partially empty sudoku should return false');

	// ====

	s = new Sudoku(
		Array.from({length: 9}, () => Array.from({length: 9}, () => 2)),
	);
	t.false(
		s.isSolved(),
		'A completely filled sudoku should return false if it has an obvious mistake',
	);
});

test('inRangeIncl', t => {
	t.throws(
		() => {
			inRangeIncl(0, 80, -1);
		},
		{message: '-1 ∉ [0, 80].'},
	);

	t.throws(
		() => {
			inRangeIncl(0, 80, 81);
		},
		{message: '81 ∉ [0, 80].'},
	);

	t.throws(
		() => {
			inRangeIncl(0, 80, 5.5);
		},
		{message: '5.5 was not an integer.'},
	);

	t.notThrows(() => {
		inRangeIncl(0, 80, 4);
	});
});
