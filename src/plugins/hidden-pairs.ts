/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import {bitCount, makeVisitor, type VisitorFn} from './shared.js';

const genericHiddenPairsSolver: VisitorFn = (structure, sudoku) => {
	// Getting all the indexes of a number
	// works like this:
	// If 7 is in cells (0, 4, 6)
	// the resulting value will be "1010001"
	//                                    ^ for 0
	//                                ^ for 4
	//                              ^ for 6
	// Iterating through each cell and
	// doing `currentValue | 1 << index`
	// This is a lot better than comparing arrays of indexes
	const summary = new Map<number, bigint>();

	for (const [index, {content, possible}] of structure.entries()) {
		const pow = 1n << BigInt(index);

		if (content === undefined) {
			for (const number of possible) {
				summary.set(number, (summary.get(number) ?? 0n) | pow);
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

			summary.set(content, (summary.get(content) ?? 0n) | pow);
		}
	}

	const equalIndexes: Array<[bigint, number[]]> = [];
	const size = BigInt(sudoku.size);

	for (const [number, key] of summary) {
		if (bitCount(key) === size) {
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
		const bitCountKey = bitCount(key);
		const numberLength = BigInt(numbers.length);

		if (bitCountKey < numberLength) {
			throw new Error(
				`bitCount was smaller than allowed: ${key.toString(2)}; ${numbers.join(
					',',
				)} (hidden-pairs)`,
			);
		}

		if (bitCountKey > numberLength) {
			continue;
		}

		for (let index = 0; index < sudoku.size; ++index) {
			if ((key & (1n << BigInt(index))) === 0n) {
				continue;
			}

			const cell = structure[index]!;

			sudoku.overridePossibles(cell, new Set(numbers));
		}
	}
};

export const hiddenPairs = makeVisitor(genericHiddenPairsSolver);
