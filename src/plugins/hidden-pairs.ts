/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import {
	BetterMap,
	eachCandidate,
	makeVisitor,
	type VisitorFn,
} from './shared.js';

const throwIfSmaller = (indices: number[], numbers: number[]): void => {
	if (indices.length < numbers.length) {
		throw new Error(
			`Less indices than numbers: indices={${indices.join(
				',',
			)}}, numbers={${numbers.join(',')}} (hidden pairs)`,
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
	const summary = new BetterMap<
		number,
		{
			indicesKey: bigint;
			indices: number[];
		}
	>();

	for (const [index, cell] of structure.entries()) {
		const pow = 1n << BigInt(index);

		if (cell.element === undefined) {
			for (const candidate of eachCandidate(structure, cell)) {
				const item = summary.getWithDefault(candidate, () => ({
					indicesKey: 0n,
					indices: [],
				}));
				item.indices.push(index);
				item.indicesKey |= pow;
			}
		}
	}

	for (const {indicesKey: indicesKeyRef, indices} of summary.values()) {
		if (indices.length === sudoku.size) {
			continue;
		}

		const numbers: number[] = [];

		for (const [elementI, {indicesKey}] of summary) {
			if ((indicesKeyRef & indicesKey) === indicesKey) {
				numbers.push(elementI);
			}
		}

		throwIfSmaller(indices, numbers);

		if (indices.length > numbers.length) {
			continue;
		}

		for (const index of indices) {
			const cell = structure[index]!;

			sudoku.overrideCandidates(cell, new Set(numbers));
		}
	}
};

export const hiddenPairs = makeVisitor(genericHiddenPairsSolver);
