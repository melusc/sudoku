import type {Sudoku} from '../sudoku.js';
import {bitCount} from './shared.js';

/* https://www.sudokuonline.io/tips/sudoku-swordfish-strategy */

const swordfishByType = (
	sudoku: Sudoku,
	getterName: 'getRow' | 'getCol',
): void => {
	const indexedCells = new Map<number, Map<number, bigint>>();

	/*
		Index all cell candidates
		For each row / col and each number
		add the index of the number:
		number[`row index`][`cell candidate`] |= `index in row`
	*/
	for (let i = 0; i < sudoku.size; ++i) {
		const structure = sudoku[getterName](i);
		const currentIndex = new Map<number, bigint>();
		const foundContent = new Set<number>();
		indexedCells.set(i, currentIndex);

		for (const [index, {candidates, content}] of structure.entries()) {
			if (content === undefined) {
				for (const candidate of candidates) {
					// Ignore numbers that already exist as "content"
					// These numbers will be removed from "candidates" soon, anyway
					if (foundContent.has(candidate)) {
						continue;
					}

					currentIndex.set(
						candidate,
						(currentIndex.get(candidate) ?? 0n) | (1n << BigInt(index)),
					);
				}
			} else {
				foundContent.add(content);
				currentIndex.delete(content);
			}
		}
	}

	const merged = new Map<number, Array<[key: bigint, indices: number[]]>>();

	for (const [index, indexed] of indexedCells) {
		for (const [number, key] of indexed) {
			// A completely empty sudoku will be a NxN swordfish
			// but that is not helpful since nothing can be removed
			if (bitCount(key) === BigInt(sudoku.size)) {
				continue;
			}

			if (!merged.has(number)) {
				merged.set(number, []);
			}

			const array = merged.get(number)!;

			for (let i = 0, l = array.length; i < l; ++i) {
				const [currentKey, indices] = array[i]!;

				if ((currentKey & key) === key) {
					indices.push(index);
				} else {
					array.push([currentKey | key, [...indices, Number(index)]]);
				}
			}

			array.push([key, [Number(index)]]);
		}
	}

	for (const [number, indexed] of merged) {
		for (const [key, indices] of indexed) {
			if (bitCount(key) !== BigInt(indices.length)) {
				continue;
			}

			for (let structIndex = 0; structIndex < sudoku.size; ++structIndex) {
				if (indices.includes(structIndex)) {
					continue;
				}

				const struct = sudoku[getterName](structIndex);

				// Cell-index in row/col
				for (let cellIndex = 0; cellIndex < sudoku.size; ++cellIndex) {
					if ((key & (1n << BigInt(cellIndex))) === 0n) {
						continue;
					}

					sudoku.removeCandidate(struct[cellIndex]!, number);
				}
			}
		}
	}
};

export const swordfish = (sudoku: Sudoku): void => {
	swordfishByType(sudoku, 'getRow');
	swordfishByType(sudoku, 'getCol');
};
