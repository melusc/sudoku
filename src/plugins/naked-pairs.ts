/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import type {ReadonlyCells} from '../cell.js';

import {bitCount, makeVisitor} from './shared.js';

const genericNakedPairsSolver = (structure: ReadonlyCells): boolean => {
	let anyChanged = false;

	const summary = new Map<number, number>();

	for (const [index, cell] of structure.entries()) {
		if (cell.content === undefined) {
			let key = 0;
			for (const number of cell.possible) {
				key |= 2 ** (Number(number) - 1);
			}

			summary.set(index, key);
		} else {
			summary.set(index, 2 ** (Number(cell.content) - 1));
		}
	}

	const equalKeys: Array<[numbers: number, indices: number[]]> = [];
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
		if (bitCount(key) !== indices.length || indices.length > 8) {
			continue;
		}

		for (let number = 0; number <= Math.log2(key); ++number) {
			if ((key & (1 << number)) === 0) {
				continue;
			}

			const numberString = `${number + 1}`;

			for (const [index, {possible}] of structure.entries()) {
				if (!indices.includes(index) && possible.has(numberString)) {
					anyChanged ||= true;

					possible.delete(numberString);
				}
			}
		}
	}

	return anyChanged;
};

export const nakedPairs = makeVisitor(genericNakedPairsSolver);
