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

	// If there is `content`, the hidden pairs can't have
	// that number anyway, so just keep track of them and ignore
	// candidates that already exist as `content`
	const foundContent = new Set<number>();

	for (const [index, {content, candidates}] of structure.entries()) {
		const pow = 1n << BigInt(index);

		if (content === undefined) {
			for (const candidate of candidates) {
				if (!foundContent.has(candidate)) {
					summary.set(candidate, (summary.get(candidate) ?? 0n) | pow);
				}
			}
		} else {
			summary.delete(content);
			foundContent.add(content);
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

			sudoku.overrideCandidates(cell, new Set(numbers));
		}
	}
};

export const hiddenPairs = makeVisitor(genericHiddenPairsSolver);
