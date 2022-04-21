/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import {bitCount, makeVisitor, type VisitorFn} from './shared.js';

const throwSmallerThanAllowed = (key: bigint, indicesLength: number): void => {
	if (bitCount(key) < indicesLength) {
		throw new Error(
			`bitCount was smaller than allowed: ${key.toString(
				2,
			)}; ${indicesLength} (naked-pairs)`,
		);
	}
};

const genericNakedPairsSolver: VisitorFn = (structure, sudoku) => {
	// All combinations of cells
	const equalKeys: Array<[numbers: bigint, indices: number[]]> = [];

	for (const [index, {content, candidates}] of structure.entries()) {
		if (content !== undefined) {
			continue;
		}

		/* Represent candidates as a number
			 Key in binary from right, if nth-digit is 1 the candidates contain n
			 Example: 10100 means it contains [2, 4]
		*/
		let key = 0n;
		for (const candidate of candidates) {
			if (structure.contents[candidate] === 0) {
				key |= 1n << BigInt(candidate);
			}
		}

		let exactMatchFound = false;

		// For all previous combinations (because new ones get added before the loop is over)
		for (let i = 0, l = equalKeys.length; i < l; ++i) {
			const [numbersMask, indices] = equalKeys[i]!;

			// If key is subset of previous key
			if ((key & numbersMask) === key) {
				indices.push(index);

				exactMatchFound ||= key === numbersMask;
			} else if (sudoku.mode === 'thorough') {
				const newKey = numbersMask | key;

				// Exit as early as possible, rather here than below
				throwSmallerThanAllowed(newKey, indices.length + 1);

				equalKeys.push([newKey, [...indices, index]]);
			}
		}

		if (!exactMatchFound) {
			equalKeys.push([key, [index]]);
		}
	}

	for (const [key, indices] of equalKeys) {
		throwSmallerThanAllowed(key, indices.length);

		if (
			/* No interesting information gained
				 There aren't any cells to remove candidates from
			*/
			indices.length === sudoku.size
			/* If there are more numbers in the naked pair
				 than cells, not all numbers can be in the cells
				 therefore the numbers can't safely be removed from the other cells
				 because they /could/ be in the other cells
			*/
			|| bitCount(key) > BigInt(indices.length)
		) {
			continue;
		}

		for (let number = 0; number < sudoku.size; ++number) {
			if ((key & (1n << BigInt(number))) === 0n) {
				continue;
			}

			for (const [index, cell] of structure.entries()) {
				if (!indices.includes(index)) {
					sudoku.removeCandidate(cell, number);
				}
			}
		}

		sudoku.emit('change');
	}
};

export const nakedPairs = makeVisitor(genericNakedPairsSolver);
