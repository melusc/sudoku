import type {Sudoku} from '../sudoku.js';
import {bitCount} from './shared.js';

type GetterName = 'getRow' | 'getCol';

/* https://www.sudokuonline.io/tips/sudoku-swordfish-strategy */

const swordfishByType = (sudoku: Sudoku, getterName: GetterName): boolean => {
	const indexedCells = new Map<number, Map<string, number>>();

	/*
		Index all cell possibles
		For each row / col and each number
		add the index of the number:
		number[`row index`][`cell possible number`] |= `index in row`
	*/
	for (let i = 0; i < 9; ++i) {
		const structure = sudoku[getterName](i);
		const currentIndex = new Map<string, number>();
		indexedCells.set(i, currentIndex);

		for (const [index, {possible}] of structure.entries()) {
			for (const number of possible) {
				currentIndex.set(
					number,
					(currentIndex.get(number) ?? 0) | (2 ** index),
				);
			}
		}
	}

	const merged = new Map<string, Array<[key: number, indices: number[]]>>();

	for (const [index, indexed] of indexedCells) {
		for (const [number, key] of indexed) {
			// A completely empty sudoku will be a 9x9 swordfish
			// but that is not helpful since nothing can be removed
			if (bitCount(key) === 9) {
				continue;
			}

			if (!merged.has(number)) {
				merged.set(number, []);
			}

			const array = merged.get(number)!;

			for (let i = 0, l = array.length; i < l; ++i) {
				const item = array[i]!;

				if ((item[0] & key) === key) {
					item[1].push(index);
				} else {
					array.push([item[0] | key, [...item[1], Number(index)]]);
				}
			}

			array.push([key, [Number(index)]]);
		}
	}

	let anyChanged = false;
	for (const [number, indexed] of merged) {
		for (const [key, indices] of indexed) {
			if (bitCount(key) !== indices.length) {
				continue;
			}

			for (let structIndex = 0; structIndex < 9; ++structIndex) {
				if (indices.includes(structIndex)) {
					continue;
				}

				const struct = sudoku[getterName](structIndex);

				// Cell-index in row/col
				for (let cellIndex = 0; cellIndex < 9; ++cellIndex) {
					if ((key & (2 ** cellIndex)) === 0) {
						continue;
					}

					const {possible} = struct[cellIndex]!;
					anyChanged ||= possible.has(number);
					possible.delete(number);
				}
			}
		}
	}

	return anyChanged;
};

export const swordfish = (sudoku: Sudoku): boolean => {
	let anyChanged = false;
	anyChanged = swordfishByType(sudoku, 'getRow') || anyChanged;
	anyChanged = swordfishByType(sudoku, 'getCol') || anyChanged;

	return anyChanged;
};
