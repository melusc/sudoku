/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import type {ReadonlyCells} from '../cell.js';

import {bitCount, makeVisitor} from './shared.js';

const genericNakedPairsSolver = (structure: ReadonlyCells): boolean => {
	let anyChanged = false;

	const summary = new Map<number, bigint>();

	for (const [index, cell] of structure.entries()) {
		if (cell.content === undefined) {
			let key = 0n;
			for (const number of cell.possible) {
				key |= 2n ** (BigInt(number) - 1n);
			}

			summary.set(index, key);
		} else {
			summary.set(index, 2n ** (BigInt(cell.content) - 1n));
		}
	}

	const equalKeys: Array<[numbers: bigint, indices: number[]]> = [];
	for (const [index, numbers] of summary) {
		let exactMatchFound = false;
		for (let i = 0; i < equalKeys.length; ++i) {
			const [numbersMask, indices] = equalKeys[i]!;

			if ((numbers & numbersMask) === numbers) {
				indices.push(index);

				exactMatchFound ||= numbers === numbersMask;
			} else {
				equalKeys.splice(i, 0, [numbersMask | numbers, [...indices, index]]);
				++i;
			}
		}

		if (!exactMatchFound) {
			equalKeys.push([numbers, [index]]);
		}
	}

	for (const [key, indices] of equalKeys) {
		if (bitCount(key) !== BigInt(indices.length) || indices.length > 8) {
			continue;
		}

		for (let number = 0; number < 9; ++number) {
			if ((key & (1n << BigInt(number))) === 0n) {
				continue;
			}

			for (const [index, {possible}] of structure.entries()) {
				if (!indices.includes(index) && possible.has(number + 1)) {
					anyChanged ||= true;

					possible.delete(number + 1);
				}
			}
		}
	}

	return anyChanged;
};

export const nakedPairs = makeVisitor(genericNakedPairsSolver);
