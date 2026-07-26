/*!
 * This file is part of @lusc/sudoku, a sudoku solver.
 * Copyright (C) 2026, Luca Schnellmann <oss@lusc.ch>

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/*
 * See https://web.archive.org/web/20210331174704/https://bestofsudoku.com/sudoku-strategy
 */

import {
	BetterMap,
	eachCandidate,
	makeVisitor,
	type VisitorFunction,
} from './shared.js';

function throwIfSmaller(indices: number[], numbers: number[]): void {
	if (indices.length < numbers.length) {
		throw new Error(
			`Less indices than numbers: indices={${indices.join(
				',',
			)}}, numbers={${numbers.join(',')}} (hidden pairs)`,
		);
	}
}

const genericHiddenPairsSolver: VisitorFunction = (structure, sudoku) => {
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

	for (const {indicesKey: indicesKeyReference, indices} of summary.values()) {
		if (indices.length === sudoku.size) {
			continue;
		}

		const numbers: number[] = [];

		for (const [elementI, {indicesKey}] of summary) {
			if ((indicesKeyReference & indicesKey) === indicesKey) {
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
