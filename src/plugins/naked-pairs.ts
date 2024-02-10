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
