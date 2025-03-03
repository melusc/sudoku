/* eslint regexp/no-super-linear-backtracking: off */
import assert from 'node:assert/strict';
import {randomInt} from 'node:crypto';
// eslint-disable-next-line n/no-unsupported-features/node-builtins
import test from 'node:test';

import {Sudoku, inRangeIncl} from '../src/sudoku.js';

import {getComparableCells} from './plugins/helpers.js';
import {transformChunkedArray, transformFlatArray} from './utilities.js';

const _ = undefined;

await test('Sudoku should be a class', () => {
	assert.equal(typeof new Sudoku(9), 'object');
});

await test('Sudoku#setElement valid element', () => {
	const s = new Sudoku(9);
	s.setElement(0, '4');

	assert.equal(s.getElement(0), '4');

	s.setElement(0, 4); // because '1' is 0, '2' is 1 ...
	assert.equal(s.getElement(0), '5');
});

await test('Sudoku#setElement invalid element', () => {
	const s = new Sudoku(9);
	assert.throws(
		() => {
			s.setElement(0, '.');
		},
		{message: 'Unexpected element ".".'},
	);

	assert.throws(
		() => {
			s.setElement(0, 9);
		},
		{message: /9/},
	);
});

await test('Sudoku#getElement', () => {
	const s = new Sudoku(16);
	assert.equal(s.getElement(8 * 9 + 8), undefined);

	s.setElement(8 * 9 + 8, '4');
	assert.equal(s.getElement(8 * 9 + 8), '4');

	s.setElement(0, 'A');
	assert.equal(s.getElement(0), 'A');
	assert.equal(s.getCell(0).element, 10);

	s.setElement(0, 0);
	assert.equal(s.getElement(0), '1');
	assert.equal(s.getCell(0).element, 0);
});

await test('Sudoku#clearCell', () => {
	const s = new Sudoku(9);
	s.setElement(6 * 9 + 6, '4');
	assert.equal(s.getElement(6 * 9 + 6), '4');
	s.clearCell(6 * 9 + 6);
	assert.equal(s.getElement(6 * 9 + 6), undefined);
});

await test('Sudoku#clearAllCells', () => {
	const s = new Sudoku(9);
	s.setElement(6 * 9 + 6, '4')
		.setElement(1 * 9 + 1, '5')
		.setElement(2 * 9 + 4, '3');

	assert.equal(s.getElement(6 * 9 + 6), '4');
	assert.equal(s.getElement(1 * 9 + 1), '5');
	assert.equal(s.getElement(2 * 9 + 4), '3');

	s.clearAllCells();

	assert.equal(s.getElement(6 * 9 + 6), undefined);
	assert.equal(s.getElement(1 * 9 + 1), undefined);
	assert.equal(s.getElement(2 * 9 + 4), undefined);
});

await test('Sudoku#getCol', () => {
	const s = new Sudoku(9);
	s.setElement(2 * 9 + 8, '2').setElement(5 * 9 + 8, '4');

	const col = s.getCol(8);

	assert.deepEqual(
		col.map(cell => cell.element),
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

await test('Sudoku#getRow', () => {
	const s = new Sudoku(9);
	s.setElement(8 * 9 + 8, '3')
		.setElement(8 * 9 + 2, '4')
		.setElement(8 * 9 + 7, '7');

	const row = s.getRow(8);

	assert.deepEqual(
		row.map(cell => cell.element),
		[undefined, undefined, 3, undefined, undefined, undefined, undefined, 6, 2],
	);
});

await test('Sudoku#getCell', () => {
	const s = new Sudoku(9);
	assert.equal(s.getCell(0), s.getBlock(0)[0]!);

	assert.equal(
		s.getCell(4 * 9 + 6),
		s.getCells()[4 * 9 + 6]!, // This is what it does, but there's not a lot to test here anyway.
	);
});

await test('Sudoku#getCells', () => {
	let s = new Sudoku(9);

	const cells1 = s.getCells();

	assert.equal(cells1.length, 81);

	for (const cell of cells1) {
		assert.equal(cell.element, undefined);

		assert.equal(cell.candidates.size, 9);
	}

	// ====

	s = new Sudoku(9);

	const sudoku = s
		.setElement(0, '2')
		.setElement(1 * 9 + 1, '4')
		.setElement(5 * 9 + 7, '2');

	assert.equal(sudoku.getCell(0).element, 1);
	assert.equal(sudoku.getCell(1 * 9 + 1).element, 3);
	assert.equal(sudoku.getCell(5 * 9 + 7).element, 1);

	// ====

	const firstRow = Array.from({length: 9}, (_v, index) => index + 1);
	s = Sudoku.fromPrefilled([firstRow.map(String)], 9);

	const cells2 = s.getCells();

	assert.deepEqual(
		cells2.map(cell => cell.element! + 1).slice(0, 9),
		firstRow,
	);
});

await test('Sudoku#getBlock', () => {
	let s = new Sudoku(9);
	const block1 = s.getBlock(0);

	assert.ok(Array.isArray(block1));
	assert.equal(block1.length, 9);

	// ====

	s = new Sudoku(9);

	for (let row = 0; row < 3; ++row) {
		for (let col = 0; col < 3; ++col) {
			s.setElement(row * 9 + col, `${row * 3 + col + 1}`);
		}
	}

	const block2 = s.getBlock(0);

	for (const [index, element] of block2.entries()) {
		assert.equal(element.element, index);
	}
});

await test('Sudoku#solve easy', () => {
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

	assert.equal(s.solve(), 'finish');

	assert.deepEqual(
		s.getCells().map(cell => cell.element),
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

	assert.ok(s.isSolved());
});

await test('Sudoku#solve evil', () => {
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

	assert.equal(s.solve(), 'finish');

	assert.deepEqual(
		s.getCells().map(cell => cell.element),
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

	assert.ok(s.isSolved());
});

await test('Sudoku#solve expert', () => {
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

	assert.equal(s.solve(), 'finish');

	assert.deepEqual(
		s.getCells().map(cell => cell.element),
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

	assert.ok(s.isSolved());
});

await test('Sudoku#solve tough 16x16', () => {
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

	assert.equal(s.solve(), 'finish');

	assert.deepEqual(
		s.getCells().map(cell => cell.element),
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

	assert.ok(s.isSolved());
});

await test('Sudoku#solve: It should realise that invalid1 is invalid', () => {
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

	assert.equal(s.solve(), 'error');

	assert.ok(!s.isSolved());
});

await test('Sudoku#solve: It should realise that invalid2 is invalid', () => {
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

	assert.equal(s.solve(), 'error');

	assert.ok(!s.isSolved());
});

await test('Sudoku#subscribe', () => {
	const s = new Sudoku(9);

	const callback = (sudoku: Sudoku): void => {
		assert.equal(sudoku.getCell(3 * 9 + 2).element, 1);
		assert.equal(sudoku.getCell(4 * 9 + 1).element, 3);
	};

	// Callback shouldn't (can't) fire
	s.setElement(3 * 9 + 2, '2');

	s.subscribe(callback);

	// Callback should fire
	s.setElement(4 * 9 + 1, '4');
});

await test('Sudoku#unsubscribe', () => {
	const s = new Sudoku(9);

	// Callback1 will be unsubscribed and as such only fire once
	// Callback2 will not and as such fire twice times

	const callback1 = (): void => {
		assert.equal(s.getElement(3 * 9 + 2), '2');
	};

	const callback2 = (): void => {
		assert.equal(s.getElement(3 * 9 + 2), '2');
	};

	s.subscribe(callback1).subscribe(callback2);

	s.setElement(3 * 9 + 2, '2');

	s.unsubscribe(callback1);

	s.setElement(4 * 9 + 1, '4');
});

await test('Sudoku#emit', () => {
	const s = new Sudoku(9);

	s.subscribe((_s, type) => {
		assert.equal(type, 'change');
	});

	s.emit('change');
});

await test('Sudoku#cellsIndividuallyValid empty sudoku', () => {
	const s = new Sudoku(9);

	assert.ok(s.cellsIndividuallyValid());
});

await test('Sudoku#cellsIndividuallyValid duplicates', () => {
	const s = new Sudoku(9);

	s.setElement(0, '1').setElement(1, '1');

	assert.ok(!s.cellsIndividuallyValid());
});

await test('Sudoku#isCellValid valid cell', () => {
	const s = new Sudoku(9);

	assert.ok(s.isCellValid(0));
});

await test('Sudoku#isCellValid empty candidates no element', () => {
	const s = new Sudoku(9);
	const cell = s.getCell(0);
	cell.candidates.clear();
	assert.ok(!s.isCellValid(cell));
});

await test('Sudoku#isCellValid element and candidates', () => {
	const s = new Sudoku(9);
	const cell = s.getCell(0);
	cell.element = 3;
	assert.ok(!s.isCellValid(cell));
});

await test('Sudoku#isCellValid duplicate in row', () => {
	const s = new Sudoku(9);
	// The cells only share the same row
	s.setElement(0, 1).setElement(7, 1);
	assert.ok(!s.isCellValid(0));
});

await test('Sudoku#isCellValid duplicate in col', () => {
	const s = new Sudoku(9);
	// The cells only share the same col
	s.setElement(0, 1).setElement(72, 1);
	assert.ok(!s.isCellValid(0));
});

await test('Sudoku#isCellValid duplicate in block', () => {
	const s = new Sudoku(9);
	// The cells only share the same block
	s.setElement(0, 1).setElement(10, 1);
	assert.ok(!s.isCellValid(0));
});

await test('Sudoku#isValid empty Sudoku', () => {
	const s = new Sudoku(16);

	assert.ok(s.isValid());
});

await test('Sudoku#isValid First row has no "1" anywhere', () => {
	const s = new Sudoku(9);

	for (const c of s.getRow(0)) {
		c.candidates.delete(0);
	}

	assert.ok(!s.isValid());
});

// Duplicate, because #isCellValid / #cellsIndividuallyValid already cover this
// but just test to make sure #isValid always calls them
await test('Sudoku#isValid First row has duplicates', () => {
	const s = new Sudoku(9);
	s.setElement(0, 1).setElement(1, 1);

	assert.ok(!s.isValid());
});

await test('Sudoku#overrideCandidates new set equal to old set', () => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.overrideCandidates(cell0, new Set([1, 2, 3]));

	assert.ok(!sudoku.anyChanged);
	assert.deepEqual(cell0.candidates, new Set([1, 2, 3]));
});

await test('Sudoku#overrideCandidates old set is subset of new set', () => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.overrideCandidates(cell0, new Set([1, 2, 3]));

	assert.ok(!sudoku.anyChanged);
	assert.deepEqual(cell0.candidates, new Set([1, 2]));
});

await test('Sudoku#overrideCandidates new set is subset of old set', () => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.overrideCandidates(cell0, new Set([1, 2]));

	assert.ok(sudoku.anyChanged);
	assert.deepEqual(cell0.candidates, new Set([1, 2]));
});

await test('Sudoku#removeCandidate toRemove is not in old set', () => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.removeCandidate(cell0, 4);

	assert.ok(!sudoku.anyChanged);
	assert.deepEqual(cell0.candidates, new Set([1, 2, 3]));
});

await test('Sudoku#removeCandidate toRemove is in old set', () => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2, 3]]], 9);
	const cell0 = sudoku.getCell(0);
	sudoku.removeCandidate(cell0, 3);

	assert.ok(sudoku.anyChanged);
	assert.deepEqual(cell0.candidates, new Set([1, 2]));
});

// Using overrideCandidates would also be possible
await test('Sudoku#removeCandidate candidates is empty afterwards', () => {
	const sudoku = Sudoku.fromPrefilled([[[1]]], 9);
	const cell0 = sudoku.getCell(0);

	assert.throws(() => {
		sudoku.removeCandidate(cell0, 1);
	});
});

await test('Sudoku#removeCandidate one candidate afterwards', () => {
	const sudoku = Sudoku.fromPrefilled([[[1, 2]]], 9);
	const cell0 = sudoku.getCell(0);

	sudoku.removeCandidate(cell0, 1);
	assert.ok(sudoku.anyChanged);
	assert.equal(cell0.element, 2);
	assert.equal(cell0.candidates.size, 0);
});

await test('Sudoku#isSolved', () => {
	let s = new Sudoku(9);

	assert.ok(!s.isSolved(), 'An empty sudoku should return false');

	// ====

	s = new Sudoku(9);
	s.setElement(3, '2').setElement(4, '4');
	assert.ok(!s.isSolved(), 'A partially empty sudoku should return false');

	// ====

	s = Sudoku.fromPrefilled(
		Array.from({length: 9}, () => Array.from({length: 9}, () => '2')),
		9,
	);
	assert.ok(
		!s.isSolved(),
		'A completely filled sudoku should return false if it has an obvious mistake',
	);
});

await test('Sudoku#clone 9x9', () => {
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

	assert.deepEqual(getComparableCells(cloned), getComparableCells(s));
	assert.notEqual(cloned, s);
});

await test('Sudoku#clone 16x16', () => {
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

	assert.deepEqual(getComparableCells(cloned), getComparableCells(s));
	assert.notEqual(cloned, s);
});

await test('Sudoku.fromPrefilled valid sudoku', () => {
	const s = Sudoku.fromPrefilled(
		[
			[0, 1, 2, 3],
			[0, 1, 2, 3],
			[0, 1, 2, 3],
			[0, 1, 2, 3],
		],
		4,
	);

	for (let index = 0; index < s.size; ++index) {
		const row = s.getRow(index);
		assert.deepEqual(
			row.map(cell => cell.element),
			[0, 1, 2, 3],
		);
	}
});

await test('Sudoku.fromPrefilled too many cols', () => {
	assert.throws(
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

await test('Sudoku.fromPrefilled too many rows', () => {
	assert.throws(
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

await test('Sudoku.fromString valid sudoku', () => {
	const s = Sudoku.fromString('1234'.repeat(4), 4);

	for (let index = 0; index < s.size; ++index) {
		const row = s.getRow(index);
		assert.deepEqual(
			row.map(cell => cell.element),
			[0, 1, 2, 3],
		);
	}
});

await test('Sudoku.fromString too long', () => {
	assert.throws(
		() => {
			Sudoku.fromString('1234'.repeat(5), 4);
		},
		{
			message: /16/,
		},
	);
});

await test('Sudoku.fromString invalid character', () => {
	assert.throws(
		() => {
			Sudoku.fromString('1234ü', 4);
		},
		{
			message: /"ü"/i,
		},
	);
});

await test('Sudoku#toString should produce a valid string', () => {
	const s = new Sudoku(16);

	// Only fill every second cell to also test
	// stringifying empty cells
	for (let index = 0; index < s.size ** 2; index += 2) {
		s.setElement(index, randomInt(s.size));
	}

	// Test by passing it to Sudoku.fromString
	// and making sure that the two sudokus are equal
	assert.deepEqual(
		getComparableCells(Sudoku.fromString(s.toString(), 16)),
		getComparableCells(s),
	);
});

await test('Sudoku#toJson', () => {
	const s = new Sudoku(9);
	const wantedJson = [1, 3, 6, [1, 3, 4, 5], [1, 5, 7, 8]];
	for (const [index, item] of wantedJson.entries()) {
		const cell = s.getCell(index);

		if (Array.isArray(item)) {
			cell.candidates = new Set(item);
		} else {
			cell.element = item;
		}
	}

	const json = s.toJson();

	assert.deepEqual(json.slice(0, 5), wantedJson);
	assert.deepEqual(
		json.slice(5),
		Array.from({length: 81 - 5}, () => [0, 1, 2, 3, 4, 5, 6, 7, 8]),
	);
});

await test('Sudoku#fromJson valid input', () => {
	const json = [2, 4, 7, [1, 2, 3, 4], [5, 6, 7], 8];

	const s = Sudoku.fromJson(json, 9);

	for (const [index, item] of json.entries()) {
		if (typeof item === 'number') {
			assert.equal(s.getElement(index), `${item + 1}`);
		} else {
			assert.deepEqual(s.getCell(index).candidates, new Set(item));
		}
	}
});

await test('Sudoku#fromJson invalid candidates', () => {
	assert.throws(
		() => {
			Sudoku.fromJson([[1, 3, 9]], 9);
		},
		{
			message: 'Expected candidate "9" at cell #0 to be 0 <= n <= 8.',
		},
	);
});

await test('Sudoku#fromJson invalid element', () => {
	assert.throws(
		() => {
			Sudoku.fromJson([9], 9);
		},
		{
			message: 'Unexpected element "9", expected an integer 0 <= n <= 8.',
		},
	);
});

await test('inRangeIncl', () => {
	assert.throws(() => {
		inRangeIncl(-1, 0, 80);
	}, /-1.+0.+80/);

	assert.throws(() => {
		inRangeIncl(81, 0, 80);
	}, /81.+0.+80/);

	assert.throws(() => {
		inRangeIncl(5.5, 0, 80);
	}, /5\.5.+0.+80/);

	assert.doesNotThrow(() => {
		inRangeIncl(4, 0, 80);
	});

	assert.throws(() => {
		// @ts-expect-error Testing case
		inRangeIncl('abc', 0, 80);
	}, /abc.+0.+80/);

	assert.throws(() => {
		inRangeIncl(0, 1, 10, (...arguments_) => arguments_.join(', '));
	}, new TypeError('0, 1, 10'));
});
