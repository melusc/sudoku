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

import {eachCandidate, makeVisitor, type VisitorFunction} from './shared.js';

function throwSmallerThanAllowed(elements: number[], indices: number[]): void {
	if (elements.length < indices.length) {
		throw new Error(
			`Less elements than indices: elements={${elements.join(
				',',
			)}}, indices=${indices.join(',')} (naked pairs)`,
		);
	}
}

const genericNakedPairsSolver: VisitorFunction = (structure, sudoku) => {
	const summary = new Map<number, {key: bigint; elements: number[]}>();

	for (const [index, cell] of structure.entries()) {
		if (cell.element !== undefined) {
			continue;
		}

		/* Represent candidates as a number
			 Key in binary from right, if nth-digit is 1 the candidates contain n
			 Example: 10100 means it contains [2, 4]
		*/
		let key = 0n;
		const elements: number[] = [];
		for (const candidate of eachCandidate(structure, cell)) {
			key |= 1n << BigInt(candidate);
			elements.push(candidate);
		}

		summary.set(index, {
			key,
			elements,
		});
	}

	for (const {key: keyO, elements} of summary.values()) {
		if (elements.length === sudoku.size) {
			continue;
		}

		const indices: number[] = [];

		for (const [index, {key: keyI}] of summary) {
			if ((keyO & keyI) === keyI) {
				indices.push(index);
			}
		}

		throwSmallerThanAllowed(elements, indices);

		if (elements.length > indices.length) {
			continue;
		}

		for (let index = 0; index < sudoku.size; ++index) {
			if (indices.includes(index)) {
				// eslint-disable-next-line unicorn/no-break-in-nested-loop
				continue;
			}

			const cell = structure[index]!;
			for (const element of elements) {
				sudoku.removeCandidate(cell, element);
			}
		}
	}
};

export const nakedPairs = makeVisitor(genericNakedPairsSolver);
