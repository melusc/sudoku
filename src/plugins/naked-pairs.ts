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
	const equalKeys: Array<[numbers: bigint, indices: number[]]> = [];

	for (const [index, {content, candidates}] of structure.entries()) {
		if (content !== undefined) {
			continue;
		}

		let key = 0n;
		for (const candidate of candidates) {
			key |= 1n << BigInt(candidate);
		}

		let exactMatchFound = false;

		for (let i = 0, l = equalKeys.length; i < l; ++i) {
			const [numbersMask, indices] = equalKeys[i]!;

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
					sudoku.removeCandidate(cell, number);
				}
			}
		}
	}
};

export const nakedPairs = makeVisitor(genericNakedPairsSolver);
