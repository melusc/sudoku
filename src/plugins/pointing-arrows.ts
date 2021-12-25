import type {Cells} from '../cell.js';
import type {Sudoku} from '../sudoku.js';
import {bitCount, bitIndex} from './shared.js';

const clearSection = (
	structure: Cells,
	blockIndex: number,
	numberToRemove: string,
): boolean => {
	let anyChanged = false;

	for (const [index, cell] of structure.entries()) {
		if (index >= blockIndex && index < blockIndex + 3) {
			continue;
		}

		if (cell.possible.has(numberToRemove)) {
			anyChanged = true;

			cell.possible.delete(numberToRemove);
		}
	}

	return anyChanged;
};

export const pointingArrows = (sudoku: Sudoku): boolean => {
	let anyChanged = false;

	for (let blockIndex = 0; blockIndex < 9; ++blockIndex) {
		const block = sudoku.getBlock(blockIndex);
		const blockRowIndex = Math.trunc(blockIndex / 3) * 3;
		const blockColIndex = (blockIndex % 3) * 3;

		/*
      The first three bits are for cols
      The last three are for rows

      If one of the sections has only one bit,
      that is a pointing arrow
    */
		const summary = new Map<string, number>();

		for (const [index, {content, possible}] of block.entries()) {
			const row = Math.trunc(index / 3);
			const col = index % 3;

			const key = (2 ** col) | (2 ** (row + 3));

			if (content === undefined) {
				for (const number of possible) {
					summary.set(number, (summary.get(number) ?? 0) | key);
				}
			} else {
				summary.set(content, (summary.get(content) ?? 0) | key);
			}
		}

		for (const [number, key] of summary) {
			const colSection = key & 0b111; // & 7
			const rowSection = (key >> 3) & 0b111;

			if (bitCount(colSection) === 1 && bitCount(rowSection) > 1) {
				anyChanged
					= clearSection(
						sudoku.getCol(blockColIndex + bitIndex(colSection)),
						blockRowIndex,
						number,
					) || anyChanged;
			} else if (bitCount(rowSection) === 1 && bitCount(colSection) > 1) {
				anyChanged
					= clearSection(
						sudoku.getRow(blockRowIndex + bitIndex(rowSection)),
						blockColIndex,
						number,
					) || anyChanged;
			}
		}
	}

	return anyChanged;
};
