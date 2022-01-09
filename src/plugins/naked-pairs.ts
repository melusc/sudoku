/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import {bitCount, makeVisitor, type VisitorFn} from './shared.js';

const genericNakedPairsSolver: VisitorFn = (structure, sudoku) => {
	const equalKeys: Array<[numbers: bigint, indices: number[]]> = [];

	for (const [index, {content, possible}] of structure.entries()) {
		if (content !== undefined) {
			continue;
		}

		let key = 0n;
		for (const number of possible) {
			key |= 1n << BigInt(number - 1);
		}

		let exactMatchFound = false;

		for (let i = 0, l = equalKeys.length; i < l; ++i) {
			const [numbersMask, indices] = equalKeys[i]!;

			if ((key & numbersMask) === key) {
				indices.push(index);

				exactMatchFound ||= key === numbersMask;
			} else {
				equalKeys.push([numbersMask | key, [...indices, index]]);
			}
		}

		if (!exactMatchFound) {
			equalKeys.push([key, [index]]);
		}
	}

	for (const [key, indices] of equalKeys) {
		if (bitCount(key) < indices.length) {
			throw new Error(
				`bitCount was smaller than allowed: ${key.toString(2)}; ${
					indices.length
				} (naked-pairs)`,
			);
		}

		if (
			indices.length === sudoku.size
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
					sudoku.removePossible(cell, number + 1);
				}
			}
		}
	}
};

export const nakedPairs = makeVisitor(genericNakedPairsSolver);
