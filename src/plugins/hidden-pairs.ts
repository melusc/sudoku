/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import type {Cells} from '../cell.js';

import {bitCount, makeVisitor} from './shared.js';

const genericHiddenPairsSolver = (structure: Cells): boolean => {
	let anyChanged = false;

	// Getting all the indexes of a number
	// works like this:
	// If 7 is in cells (0, 4, 6)
	// the resulting value will be "1010001"
	//                                    ^ for 0
	//                                ^ for 4
	//                              ^ for 6
	// Iterating through each cell and
	// doing `currentValue | 2 ** index`
	// This is a lot better than comparing arrays of indexes
	const summary = new Map<string, number>();

	for (let index = 0; index < 9; ++index) {
		const {content, possible} = structure[index]!; // It's [0,8]

		if (content === undefined) {
			for (const number of possible) {
				summary.set(number, (summary.get(number) ?? 0) | (2 ** index));
			}
		} else {
			/*
          This part fixes a bug:
          [
            {1,2,3}, // these are possibles
            {1,2},
            3, // this is filled in that cell
            ...
          ]
          Webpack doesn't keep the same order as is exported from plugins.ts
          (and the plugins shouldn't rely on it).
          When remove-duplicates (now naked-pairs) doesn't run first, the scenarios above can occur
          where hidden-pairs finds the only cell that has 3 in #possible and then removes all others
          (here cell at index 0), incorrectly resulting in two cells with 3
        */

			summary.set(content, (summary.get(content) ?? 0) | (2 ** index));
		}
	}

	const equalIndexes: Array<[number, string[]]> = [];

	for (const [number, key] of summary) {
		if (bitCount(key) > 8) {
			continue;
		}

		let exactMatchFound = false;

		for (const equalIndex of equalIndexes) {
			const [curKey, indices] = equalIndex;

			if ((key | curKey) === key || (key | curKey) === curKey) {
				equalIndex[0] |= key;
				indices.push(number);

				exactMatchFound ||= key === curKey;
			}
		}

		if (!exactMatchFound) {
			equalIndexes.push([key, [number]]);
		}
	}

	for (const [key, numbers] of equalIndexes) {
		if (bitCount(key) < numbers.length) {
			throw new Error(
				`bitCount was smaller than allowed: ${key.toString(2)}; ${numbers.join(
					',',
				)}`,
			);
		}

		if (bitCount(key) > numbers.length) {
			continue;
		}

		for (let index = 0; index <= Math.log2(key); ++index) {
			if ((key & (2 ** index)) === 0) {
				continue;
			}

			const cell = structure[index]!; // It's certainly [0,8]

			if (cell.possible.size > numbers.length) {
				anyChanged = true;

				cell.possible = new Set(numbers);
			}
		}
	}

	return anyChanged;
};

export const hiddenPairs = makeVisitor(genericHiddenPairsSolver);
