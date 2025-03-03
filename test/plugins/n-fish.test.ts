// eslint-disable-next-line n/no-unsupported-features/node-builtins
import test, {type TestContext} from 'node:test';

import {nFish} from '../../src/plugins/n-fish.js';
import {Sudoku} from '../../src/sudoku.js';

function makeCheck(s: Sudoku, t: TestContext) {
	return (index: number, expected: number[] | number): void => {
		const cell = s.getCell(index);

		if (Array.isArray(expected)) {
			t.assert.deepEqual(s.getCell(index).candidates, new Set(expected));
		} else {
			t.assert.equal(cell.element, expected);
			t.assert.equal(cell.candidates.size, 0);
		}
	};
}

await test('regular n-fish #1', (t: TestContext) => {
	// ^ for the participating numbers
	// ^X for the numbers to be removed

	const s = Sudoku.fromPrefilled(
		[
			[4, [1, 6], 2, [1, 7], 5, 3, 8, 0, [1, 7, 6]],
			//   ^          ^                   ^
			[[1, 7], 8, 3, 4, 0, 6, [1, 7], 2, 5],
			// ^X
			[[1, 6, 7], 5, 0, [1, 2], 8, [2, 7], 4, 3, [1, 6]],
			// ^X              ^                        ^
			[[1, 3, 6], [1, 6], 5, 0, 4, [2, 7], [1, 3, 7], 8, [1, 2]],
			//           ^                        ^X            ^
			[2, 7, 8, 6, [1, 3], 5, [1, 3], 4, 0],
			[[1, 3], 0, 4, [2, 7], [1, 3], 8, 5, 6, [2, 7]],
			[5, 4, 6, 3, 7, 0, 2, 1, 8],
			[8, 2, 1, 5, 6, 4, 0, 7, 3],
			[0, 3, 7, 8, 2, 1, 6, 5, 4],
		],
		9,
	);
	const check = makeCheck(s, t);

	nFish(s);
	t.assert.ok(s.anyChanged);

	check(1 * 9 + 0, [1, 7]);
	check(2 * 9 + 0, [6, 7]); // Remove 1
	check(3 * 9 + 0, [3, 6]); // Remove 1
	check(5 * 9 + 0, [1, 3]);

	check(4 * 9 + 4, [1, 3]);
	check(5 * 9 + 4, [1, 3]);

	check(1 * 9 + 6, [1, 7]);
	check(3 * 9 + 6, [3, 7]); // Remove 1
	check(4 * 9 + 6, [1, 3]);
});

await test('regular n-fish #2', (t: TestContext) => {
	const s = Sudoku.fromPrefilled(
		[
			[[5, 6], [3, 5, 6], 2, [3, 4], 8, 1, [4, 5], 0, 7],
			//           ^X
			[7, [3, 5], 1, 6, 0, [3, 4], 2, [4, 5], [5, 8]],
			//      ^                           ^
			[0, 8, 4, 5, 2, 7, 6, 3, 1],
			[4, 2, 5, 1, 3, 8, 0, 7, 6],
			[3, 7, 6, 0, 5, 2, 1, 8, 4],
			[8, 1, 0, 7, 4, 6, 3, [2, 5], [2, 5]],
			//                        ^       ^
			[[1, 6], [6, 0], 3, 8, 7, [4, 5], [4, 5], [1, 2], [2, 0]],
			[2, [4, 5], 8, [3, 4], 1, 0, 7, 6, [3, 5]],
			//      ^                              ^
			[[1, 5], [4, 5, 0], 7, 2, 6, [3, 4, 5], 8, [1, 4, 5], [3, 5, 0]],
			//           ^X                                   ^X      ^X
		],
		9,
	);
	const check = makeCheck(s, t);

	nFish(s);
	t.assert.ok(s.anyChanged);

	check(0 * 9 + 1, [3, 6]); // Remove 5

	check(1 * 9 + 1, [3, 5]);
	check(1 * 9 + 7, [4, 5]);
	check(1 * 9 + 8, [5, 8]);

	check(5 * 9 + 1, 1);
	check(5 * 9 + 7, [2, 5]);
	check(5 * 9 + 8, [2, 5]);

	check(7 * 9 + 1, [4, 5]);
	check(7 * 9 + 7, 6);
	check(7 * 9 + 8, [3, 5]);

	check(8 * 9 + 1, [4, 0]); // Remove 5
	check(8 * 9 + 7, [1, 4]); // Remove 5
	check(8 * 9 + 8, [3, 0]); // Remove 5
});

await test('Detect invalid sudoku', (t: TestContext) => {
	const candidatesRest = Array.from({length: 7}, () => [
		0, 2, 3, 4, 5, 6, 7, 8,
	]);

	const row = [[1], [1], ...candidatesRest];

	const s = Sudoku.fromPrefilled([row, row, row], 9);

	t.assert.throws(
		() => {
			nFish(s);
		},
		{
			// eslint-disable-next-line unicorn/better-regex
			message: /\{0,1,2\}.+\{0,1\}/,
		},
	);
});
