/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import {bitCount, makeVisitor, type VisitorFn} from './shared.js';

const throwIfSmaller = (key: bigint, numbers: number[]): void => {
	if (bitCount(key) < numbers.length) {
		throw new Error(
			`Amount of numbers was less than the amount of cells they're spread across ${key.toString(
				2,
			)}; {${numbers.join(',')}} (hidden-pairs)`,
		);
	}
};

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

	for (const [index, {element, candidates}] of structure.entries()) {
		const pow = 1n << BigInt(index);

		if (element === undefined) {
			for (const candidate of candidates) {
				if (structure.elements[candidate] === 0) {
					summary.set(candidate, (summary.get(candidate) ?? 0n) | pow);
				}
			}
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

				// Exit early since it is an error in any case
				// already at this point
				throwIfSmaller(equalIndex[0], indices);

				exactMatchFound ||= key === curKey;
			}
		}

		if (!exactMatchFound) {
			equalIndexes.push([key, [number]]);
		}
	}

	for (const [key, numbers] of equalIndexes) {
		throwIfSmaller(key, numbers);

		if (bitCount(key) > numbers.length) {
			continue;
		}

		for (let index = 0; index < sudoku.size; ++index) {
			if ((key & (1n << BigInt(index))) === 0n) {
				continue;
			}

			const cell = structure[index]!;

			sudoku.overrideCandidates(cell, new Set(numbers));
		}

		sudoku.emit('change');
	}
};

export const hiddenPairs = makeVisitor(genericHiddenPairsSolver);
