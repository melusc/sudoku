import type {Sudoku} from '../sudoku.js';
import {bitCount} from './shared.js';

type GetterName = 'getRow' | 'getCol';

/* https://www.sudokuonline.io/tips/sudoku-swordfish-strategy */

const swordfishByType = (sudoku: Sudoku, getterName: GetterName): boolean => {
	debugger;

	const indexedCells: Record<number, Record<number, number>> = {};

	/*
		Index all cell possibles
		For each row / col and each number
		add the index of the number:
		number[`row index`][`cell possible number`] |= `index in row`
	*/
	for (let i = 0; i < 9; ++i) {
		const structure = sudoku[getterName](i);
		const currentIndex: Record<number, number> = {};
		indexedCells[i] = currentIndex;

		for (const [index, {possible}] of structure.entries()) {
			for (const number of possible) {
				currentIndex[Number(number)] ??= 0;
				currentIndex[Number(number)] |= 2 ** index;
			}
		}
	}

	const merged: Record<number, Array<[key: number, indices: number[]]>> = {};

	for (const [index, indexed] of Object.entries(indexedCells)) {
		for (const [number, key] of Object.entries(indexed)) {
			merged[Number(number)] ??= [];
			const array = merged[Number(number)]!;

			for (let i = 0, l = array.length; i < l; ++i) {
				const item = array[i]!;

				if ((item[0] & key) === key) {
					item[1].push(Number(index));
				} else {
					array.push([item[0] | key, [...item[1], Number(index)]]);
				}
			}

			array.push([key, [Number(index)]]);
		}
	}

	let anyChanged = false;
	for (const [number, indexed] of Object.entries(merged)) {
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
