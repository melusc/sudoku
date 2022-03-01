import {randomInt} from 'node:crypto';

import test from 'ava';

import {Sudoku, inRangeIncl} from '../src/sudoku.js';
import {getComparableCells} from './plugins/helpers.js';
import {transformChunkedArray, transformFlatArray} from './util.js';

const _ = undefined;

test('Sudoku should be a class', t => {
	t.is(typeof new Sudoku(9), 'object');
});

test('Sudoku#setContent valid content', t => {
	const s = new Sudoku(9);
	s.setContent(0, '4');

	t.is(s.getContent(0), '4');

	s.setContent(0, 4); // because '1' is 0, '2' is 1 ...
	t.is(s.getContent(0), '5');
});

test('Sudoku#setContent invalid content', t => {
	const s = new Sudoku(9);
	t.throws(
		() => {
			s.setContent(0, '.');
		},
		{message: /not in alphabet: "\."$/},
	);

	t.throws(
		() => {
			s.setContent(0, 9);
		},
		{message: /9/},
	);
});

test('Sudoku#getContent', t => {
	const s = new Sudoku(16);
	t.is(s.getContent(8 * 9 + 8), undefined);

	s.setContent(8 * 9 + 8, '4');
	t.is(s.getContent(8 * 9 + 8), '4');

	s.setContent(0, 'A');
	t.is(s.getContent(0), 'A');
	t.is(s.getCell(0).content, 10);

	s.setContent(0, 0);
	t.is(s.getContent(0), '1');
	t.is(s.getCell(0).content, 0);
});

test('Sudoku#clearCell', t => {
	const s = new Sudoku(9);
	s.setContent(6 * 9 + 6, '4');
	t.is(s.getContent(6 * 9 + 6), '4');
	s.clearCell(6 * 9 + 6);
	t.is(s.getContent(6 * 9 + 6), undefined);
});

test('Sudoku#clearAllCells', t => {
	const s = new Sudoku(9);
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
	const s = new Sudoku(9);
	s.setContent(2 * 9 + 8, '2').setContent(5 * 9 + 8, '4');

	const col = s.getCol(8);

	t.deepEqual(
		col.map(cell => cell.content),
		[
			undefined,
			undefined,
			1,
			undefined,
			undefined,
			3,
			undefined,
			undefined,
			undefined,
		],
	);
});

test('Sudoku#getRow', t => {
	const s = new Sudoku(9);
	s.setContent(8 * 9 + 8, '3')
		.setContent(8 * 9 + 2, '4')
		.setContent(8 * 9 + 7, '7');

	const row = s.getRow(8);

	t.deepEqual(
		row.map(cell => cell.content),
		[undefined, undefined, 3, undefined, undefined, undefined, undefined, 6, 2],
	);
});

test('Sudoku#getCell', t => {
	const s = new Sudoku(9);
	t.is(s.getCell(0), s.getBlock(0)[0]!);

	t.is(
		s.getCell(4 * 9 + 6),
		s.getCells()[4 * 9 + 6]!, // This is what it does, but there's not a lot to test here anyway.
	);
});

test('Sudoku#getCells', t => {
	let s = new Sudoku(9);

	const cells1 = s.getCells();

	t.is(cells1.length, 81);

	for (const cell of cells1) {
		t.is(cell.content, undefined);

		t.is(typeof cell.key, 'string');

		t.is(cell.candidates.size, 9);
	}

	// ====

	s = new Sudoku(9);

	const sudoku = s
		.setContent(0, '2')
		.setContent(1 * 9 + 1, '4')
		.setContent(5 * 9 + 7, '2');

	t.is(sudoku.getCell(0).content, 1);
	t.is(sudoku.getCell(1 * 9 + 1).content, 3);
	t.is(sudoku.getCell(5 * 9 + 7).content, 1);

	// ====

	const firstRow = Array.from({length: 9}, (_v, index) => index + 1);
	s = Sudoku.fromPrefilled([firstRow.map(content => String(content))], 9);

	const cells2 = s.getCells();

	t.deepEqual(cells2.map(cell => cell.content! + 1).slice(0, 9), firstRow);
});

test('Sudoku#getBlock', t => {
	let s = new Sudoku(9);
	const block1 = s.getBlock(0);

	t.true(Array.isArray(block1));
	t.is(block1.length, 9);

	// ====

	s = new Sudoku(9);

	for (let row = 0; row < 3; ++row) {
		for (let col = 0; col < 3; ++col) {
			s.setContent(row * 9 + col, `${row * 3 + col + 1}`);
		}
	}

	const block2 = s.getBlock(0);

	for (const [index, element] of block2.entries()) {
		t.is(element.content, index);
	}
});

test('Sudoku#solve easy', t => {
	t.plan(3);

	const s = Sudoku.fromPrefilled(
		[
			[_, '1', _, '3', '8', _, _, '5', '2'],
			[_, '6', '5', _, _, _, _, '8', '9'],
			[_, _, _, '5', _, '9'],
			[_, _, _, '4', '1', _, '8'],
			['2', '3', _, _, _, _, _, '4', '6'],
			[_, _, '8', _, '3', '7'],
			[_, _, _, '1', _, '8'],
			['6', '5', _, _, _, _, '2', '3'],
			['7', '8', _, _, '5', '3', _, '1'],
		],
		9,
	);

	t.is(s.solve(), 'finish');

	t.deepEqual(
		s.getCells().map(cell => cell.content),
		transformFlatArray([
			[9, 1, 4, 3, 8, 6, 7, 5, 2],
			[3, 6, 5, 7, 2, 1, 4, 8, 9],
			[8, 7, 2, 5, 4, 9, 3, 6, 1],
			[5, 9, 6, 4, 1, 2, 8, 7, 3],
			[2, 3, 7, 8, 9, 5, 1, 4, 6],
			[1, 4, 8, 6, 3, 7, 9, 2, 5],
			[4, 2, 3, 1, 6, 8, 5, 9, 7],
			[6, 5, 1, 9, 7, 4, 2, 3, 8],
			[7, 8, 9, 2, 5, 3, 6, 1, 4],
		]),
	);

	t.true(s.isSolved());
});

test('Sudoku#solve evil', t => {
	t.plan(3);

	const s = Sudoku.fromPrefilled(
		[
			['6', _, '4', _, _, _, _, _, '3'],
			[_, _, _, _, '3', '7', '8'],
			[_, _, _, '5', _, _, '7'],
			['8', '9', _, '1'],
			['3', _, _, _, _, _, _, _, '2'],
			[_, _, _, _, _, '3', _, '1', '9'],
			[_, _, '5', _, _, '9'],
			[_, _, '1', '8', '6'],
			['9', _, _, _, _, _, '4', _, '8'],
		],
		9,
	);

	t.is(s.solve(), 'finish');

	t.deepEqual(
		s.getCells().map(cell => cell.content),
		transformFlatArray([
			[6, 7, 4, 9, 2, 8, 1, 5, 3],
			[1, 5, 9, 6, 3, 7, 8, 2, 4],
			[2, 3, 8, 5, 4, 1, 7, 9, 6],
			[8, 9, 6, 1, 5, 2, 3, 4, 7],
			[3, 1, 7, 4, 9, 6, 5, 8, 2],
			[5, 4, 2, 7, 8, 3, 6, 1, 9],
			[4, 8, 5, 3, 7, 9, 2, 6, 1],
			[7, 2, 1, 8, 6, 4, 9, 3, 5],
			[9, 6, 3, 2, 1, 5, 4, 7, 8],
		]),
	);

	t.true(s.isSolved());
});

test('Sudoku#solve expert', t => {
	t.plan(3);

	const s = Sudoku.fromPrefilled(
		[
			[_, _, _, _, _, '4', _, _, '2'],
			[_, '6', _, '2', _, _, _, '3'],
			[_, '8', _, _, _, '3', '5', _, '9'],
			[_, '4', _, _, _, _, '1'],
			['1', _, _, '7', _, '5'],
			['5', _, '3'],
			[_, '9', _, '3'],
			[_, _, '4', _, '6', '1'],
			[_, _, '5', _, _, _, '7'],
		],
		9,
	);

	t.is(s.solve(), 'finish');

	t.deepEqual(
		s.getCells().map(cell => cell.content),
		transformFlatArray([
			[3, 5, 1, 9, 8, 4, 6, 7, 2],
			[4, 6, 9, 2, 5, 7, 8, 3, 1],
			[2, 8, 7, 6, 1, 3, 5, 4, 9],
			[9, 4, 6, 8, 3, 2, 1, 5, 7],
			[1, 2, 8, 7, 4, 5, 3, 9, 6],
			[5, 7, 3, 1, 9, 6, 2, 8, 4],
			[6, 9, 2, 3, 7, 8, 4, 1, 5],
			[7, 3, 4, 5, 6, 1, 9, 2, 8],
			[8, 1, 5, 4, 2, 9, 7, 6, 3],
		]),
	);

	t.true(s.isSolved());
});

test('Sudoku#solve tough 16x16', t => {
	t.plan(3);

	// https://puzzlemadness.co.uk/16by16giantsudoku/tough/2022/1/7
	// (https://i.imgur.com/SClE7Yf.png)
	const s = Sudoku.fromPrefilled(
		transformChunkedArray([
			[_, 11, _, 4, _, _, 5, _, _, _, 3, _, _, 16, 8],
			[1, 10, _, _, 14, 12, _, _, _, _, _, 15, 9, _, 3, 13],
			[8, 9, 15, _, _, _, 11, _, 13, _, 7, _, _, _, _, 14],
			[3, _, _, 13, _, _, _, _, _, 2, _, 16, _, 1, 11],
			[7, 6, _, _, 15, _, _, _, _, _, _, 9, 14, _, 4],
			[9, 12, _, _, 6, _, 1, 10, 16, _, _, _, 13, _, 15],
			[_, 1, _, _, _, _, _, _, _, 7, _, _, 10, 2],
			[_, 4, _, 15, _, _, _, 14, 10, _, 13, 8, 1, 7],
			[_, _, 2, 12, 13, _, 14, _, _, 6],
			[_, 3, 14, _, _, 1, _, _, 4, _, _, _, _, 11],
			[11, _, _, _, _, _, _, _, 15, 14, _, _, 12],
			[_, _, _, _, 12, 8, _, 3, _, 10, 1, _, _, _, 2, 15],
			[16, _, 4, _, _, _, 7, 15, 6, _, _, _, _, _, 10],
			[_, 7, _, 3, _, 11, _, 2, _, 16, _, 1, 5, 9],
			[_, _, _, _, 5, _, 6, _, _, _, _, 11, _, 3],
			[_, _, _, 10, _, _, _, 13, 9, 8],
		]),
		16,
	);

	s.shouldLogErrors = true;

	t.is(s.solve(), 'finish');

	t.deepEqual(
		s.getCells().map(cell => cell.content),
		transformFlatArray([
			[2, 11, 12, 4, 7, 13, 5, 6, 1, 9, 3, 14, 15, 16, 8, 10],
			[1, 10, 7, 16, 14, 12, 2, 8, 5, 11, 6, 15, 9, 4, 3, 13],
			[8, 9, 15, 5, 3, 16, 11, 1, 13, 4, 7, 10, 2, 6, 12, 14],
			[3, 14, 6, 13, 9, 15, 10, 4, 12, 2, 8, 16, 7, 1, 11, 5],
			[7, 6, 10, 8, 15, 3, 13, 12, 2, 1, 11, 9, 14, 5, 4, 16],
			[9, 12, 3, 2, 6, 7, 1, 10, 16, 5, 14, 4, 13, 8, 15, 11],
			[14, 1, 13, 11, 16, 4, 8, 5, 3, 7, 15, 6, 10, 2, 9, 12],
			[5, 4, 16, 15, 11, 2, 9, 14, 10, 12, 13, 8, 1, 7, 6, 3],
			[4, 15, 2, 12, 13, 5, 14, 11, 8, 6, 16, 7, 3, 10, 1, 9],
			[10, 3, 14, 6, 2, 1, 15, 7, 4, 13, 9, 12, 16, 11, 5, 8],
			[11, 8, 5, 1, 10, 6, 16, 9, 15, 14, 2, 3, 12, 13, 7, 4],
			[13, 16, 9, 7, 12, 8, 4, 3, 11, 10, 1, 5, 6, 14, 2, 15],
			[16, 2, 4, 14, 8, 9, 7, 15, 6, 3, 5, 13, 11, 12, 10, 1],
			[15, 7, 8, 3, 4, 11, 12, 2, 14, 16, 10, 1, 5, 9, 13, 6],
			[12, 13, 1, 9, 5, 10, 6, 16, 7, 15, 4, 11, 8, 3, 14, 2],
			[6, 5, 11, 10, 1, 14, 3, 13, 9, 8, 12, 2, 4, 15, 16, 7],
		]),
	);

	t.true(s.isSolved());
});

test('Sudoku#solve: It should realise that invalid1 is invalid', t => {
	t.plan(2);

	const s = Sudoku.fromPrefilled(
		[
			// Here both 5 and 6 would have to be in the middle/middle cell
			// which is not possible, since only one number can be in each cell
			[],
			[_, _, _, '6'],
			[_, _, _, '5'],
			[_, _, _, _, _, _, '5', '6'],
			[],
			[_, '6', '5'],
			[_, _, _, _, _, '5'],
			[_, _, _, _, _, '6'],
		],
		9,
	);

	t.is(s.solve(), 'error');

	t.false(s.isSolved());
});

test('Sudoku#solve: It should realise that invalid2 is invalid', t => {
	t.plan(2);

	const s = Sudoku.fromPrefilled(
		[
			// Here 1,2,3 have to be in the third column of the middle/middle block
			// And 4,5,6 have to be in the first row of the middle/middle block
			// Since those two overlap this is an invalid sudoku
			[_, _, _, _, '1'],
			[_, _, _, _, '2'],
			[_, _, _, _, '3'],
			_,
			['4', '5', '6'],
			[_, _, _, _, _, _, '4', '5', '6'],
			[_, _, _, '1'],
			[_, _, _, '2'],
			[_, _, _, '3'],
		],
		9,
	);

	t.is(s.solve(), 'error');

	t.false(s.isSolved());
});

test('Sudoku#subscribe', t => {
	const s = new Sudoku(9);

	t.plan(2);

	const callback = (sudoku: Sudoku): void => {
		t.is(sudoku.getCell(3 * 9 + 2).content, 1);
		t.is(sudoku.getCell(4 * 9 + 1).content, 3);
	};

	// Callback shouldn't (can't) fire
	s.setContent(3 * 9 + 2, '2');

	s.subscribe(callback);

	// Callback should fire
	s.setContent(4 * 9 + 1, '4');
});

test('Sudoku#unsubscribe', t => {
	const s = new Sudoku(9);

	t.plan(3);

	// Callback1 will be unsubscribed and as such only fire twice
	// Callback2 will not and as such fire four times

	const callback1 = (): void => {
		t.is(s.getContent(3 * 9 + 2), '2');
	};

	const callback2 = (): void => {
		t.is(s.getContent(3 * 9 + 2), '2');
	};

	s.subscribe(callback1).subscribe(callback2);

	s.setContent(3 * 9 + 2, '2');

	s.unsubscribe(callback1);

	s.setContent(4 * 9 + 1, '4');
});

test('Sudoku#cellsIndividuallyValidByStructure', t => {
	let s = new Sudoku(9);

	t.true(s.cellsIndividuallyValidByStructure(), 'Empty sudoku should be valid');

	// ====

	s = new Sudoku(9);
	s.getCell(2).setContent(9);
	t.is(s.getContent(2), undefined);
	t.true(
		s.cellsIndividuallyValidByStructure(),
		'A sudoku with an invalid cell should return false',
	);
	s.setContent(2, '2');
	t.true(
		s.cellsIndividuallyValidByStructure(),
		'It should return true after fixing an invalid cell',
	);

	// ====

	s = new Sudoku(9);
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

	s = new Sudoku(9);
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

test('Sudoku#overrideCandidates new set equal old set', t => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.overrideCandidates(cell0, new Set([1, 2, 3]));

	t.false(sudoku.anyChanged);
	t.deepEqual(cell0.candidates, new Set([1, 2, 3]));
});

test('Sudoku#overrideCandidates old set is subset of new set', t => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.overrideCandidates(cell0, new Set([1, 2, 3]));

	t.false(sudoku.anyChanged);
	t.deepEqual(cell0.candidates, new Set([1, 2]));
});

test('Sudoku#overrideCandidates new set is subset of old set', t => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.overrideCandidates(cell0, new Set([1, 2]));

	t.true(sudoku.anyChanged);
	t.deepEqual(cell0.candidates, new Set([1, 2]));
});

test('Sudoku#removeCandidate toRemove is not in old set', t => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.removeCandidate(cell0, 4);

	t.false(sudoku.anyChanged);
	t.deepEqual(cell0.candidates, new Set([1, 2, 3]));
});

test('Sudoku#removeCandidate toRemove is in old set', t => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.removeCandidate(cell0, 3);

	t.true(sudoku.anyChanged);
	t.deepEqual(cell0.candidates, new Set([1, 2]));
});

// Using overrideCandidates would also be possible
test('Sudoku#removeCandidate candidates is empty afterwards', t => {
	const sudoku = Sudoku.fromPrefilled([[[1]]], 9);
	const cell0 = sudoku.getCell(0);

	t.throws(() => {
		sudoku.removeCandidate(cell0, 1);
	});
});

test('Sudoku#removeCandidate one candidate afterwards', t => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2]]], 9);
	const cell0 = sudoku.getCell(0);

	sudoku.removeCandidate(cell0, 1);
	t.true(sudoku.anyChanged);
	t.is(cell0.content, 2);
	t.is(cell0.candidates.size, 0);
});

test('Sudoku#isSolved', t => {
	let s = new Sudoku(9);

	t.false(s.isSolved(), 'An empty sudoku should return false');

	// ====

	s = new Sudoku(9);
	s.setContent(3, '2').setContent(4, '4');
	t.false(s.isSolved(), 'A partially empty sudoku should return false');

	// ====

	s = Sudoku.fromPrefilled(
		Array.from({length: 9}, () => Array.from({length: 9}, () => '2')),
		9,
	);
	t.false(
		s.isSolved(),
		'A completely filled sudoku should return false if it has an obvious mistake',
	);
});

test('Sudoku#clone 9x9', t => {
	const s = Sudoku.fromPrefilled(
		[
			[_, _, _, _, _, '4', _, _, '2'],
			[_, '6', _, '2', _, _, _, '3'],
			[_, '8', _, _, _, '3', '5', _, '9'],
			[_, '4', _, _, _, _, '1'],
			['1', _, _, '7', _, '5'],
			['5', _, '3'],
			[_, '9', _, '3'],
			[_, _, '4', _, '6', '1'],
			[_, _, '5', _, _, _, '7'],
		],
		9,
	);

	const cloned = s.clone();

	t.deepEqual(getComparableCells(cloned), getComparableCells(s));
	t.not(cloned, s);
});

test('Sudoku#clone 16x16', t => {
	const s = Sudoku.fromPrefilled(
		transformChunkedArray([
			[2, 11, 12, 4, 7, 13, 5, 6, 1, 9, 3, 14, 15, 16, 8, 10],
			[1, 10, 7, 16, 14, 12, 2, 8, 5, 11, 6, 15, 9, 4, 3, 13],
			[8, 9, 15, 5, 3, 16, 11, 1, 13, 4, 7, 10, 2, 6, 12, 14],
			[3, 14, 6, 13, 9, 15, 10, 4, 12, 2, 8, 16, 7, 1, 11, 5],
			[7, 6, 10, 8, 15, 3, 13, 12, 2, 1, 11, 9, 14, 5, 4, 16],
			[9, 12, 3, 2, 6, 7, 1, 10, 16, 5, 14, 4, 13, 8, 15, 11],
			[14, 1, 13, 11, 16, 4, 8, 5, 3, 7, 15, 6, 10, 2, 9, 12],
			[5, 4, 16, 15, 11, 2, 9, 14, 10, 12, 13, 8, 1, 7, 6, 3],
			[4, 15, 2, 12, 13, 5, 14, 11, 8, 6, 16, 7, 3, 10, 1, 9],
			[10, 3, 14, 6, 2, 1, 15, 7, 4, 13, 9, 12, 16, 11, 5, 8],
			[11, 8, 5, 1, 10, 6, 16, 9, 15, 14, 2, 3, 12, 13, 7, 4],
			[13, 16, 9, 7, 12, 8, 4, 3, 11, 10, 1, 5, 6, 14, 2, 15],
			[16, 2, 4, 14, 8, 9, 7, 15, 6, 3, 5, 13, 11, 12, 10, 1],
			[15, 7, 8, 3, 4, 11, 12, 2, 14, 16, 10, 1, 5, 9, 13, 6],
			[12, 13, 1, 9, 5, 10, 6, 16, 7, 15, 4, 11, 8, 3, 14, 2],
			[6, 5, 11, 10, 1, 14, 3, 13, 9, 8, 12, 2, 4, 15, 16, 7],
		]),
		16,
	);

	const cloned = s.clone();

	t.deepEqual(getComparableCells(cloned), getComparableCells(s));
	t.not(cloned, s);
});

test('Sudoku.fromPrefilled valid sudoku', t => {
	const s = Sudoku.fromPrefilled(
		[
			[0, 1, 2, 3],
			[0, 1, 2, 3],
			[0, 1, 2, 3],
			[0, 1, 2, 3],
		],
		4,
	);

	for (let i = 0; i < s.size; ++i) {
		const row = s.getRow(i);
		t.deepEqual(
			row.map(cell => cell.content),
			[0, 1, 2, 3],
		);
	}
});

test('Sudoku.fromPrefilled too many cols', t => {
	t.throws(
		() => {
			Sudoku.fromPrefilled(
				[
					[0, 1, 2, 3, 4],
					[0, 1, 2, 3, 4],
					[0, 1, 2, 3, 4],
				],
				4,
			);
		},
		{
			message: /4/, // 4 is index, not number
		},
	);
});

test('Sudoku.fromPrefilled too many rows', t => {
	t.throws(
		() => {
			Sudoku.fromPrefilled(
				[
					[0, 1, 2, 3],
					[0, 1, 2, 3],
					[0, 1, 2, 3],
					[0, 1, 2, 3],
					[0, 1, 2, 3],
				],
				4,
			);
		},
		{
			message: /4/,
		},
	);
});

test('Sudoku.fromString valid sudoku', t => {
	const s = Sudoku.fromString('1234'.repeat(4), 4);

	for (let i = 0; i < s.size; ++i) {
		const row = s.getRow(i);
		t.deepEqual(
			row.map(cell => cell.content),
			[0, 1, 2, 3],
		);
	}
});

test('Sudoku.fromString too long', t => {
	t.throws(
		() => {
			Sudoku.fromString('1234'.repeat(5), 4);
		},
		{
			message: /16/,
		},
	);
});

test('Sudoku.fromString invalid character', t => {
	t.throws(
		() => {
			Sudoku.fromString('1234ü', 4);
		},
		{
			message: /"ü"/i,
		},
	);
});

test('Sudoku#toString should produce a valid string', t => {
	const s = new Sudoku(16);

	for (let i = 0; i < 16 ** 2; ++i) {
		s.setContent(i, randomInt(16));
	}

	// Test by passing it to Sudoku.fromString
	// and making sure that the two sudokus are equal
	t.deepEqual(
		getComparableCells(Sudoku.fromString(s.toString(), 16)),
		getComparableCells(s),
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
