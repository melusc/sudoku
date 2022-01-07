import type {ReadonlyCells} from '../cell.js';
import type {Sudoku} from '../sudoku.js';
import {bitCount, bitIndex} from './shared.js';

const clearSection = (
	structure: ReadonlyCells,
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
		const summary = new Map<string, bigint>();

		for (const [index, {content, possible}] of block.entries()) {
			const row = BigInt(Math.trunc(index / 3));
			const col = BigInt(index % 3);

			const key = (1n << col) | (1n << (row + 3n));

			if (content === undefined) {
				for (const number of possible) {
					summary.set(number, (summary.get(number) ?? 0n) | key);
				}
			} else {
				summary.set(content, (summary.get(content) ?? 0n) | key);
			}
		}

		for (const [number, key] of summary) {
			const colSection = key & 0b111n; // & 7
			const rowSection = (key >> 3n) & 0b111n;

			if (bitCount(colSection) === 1n && bitCount(rowSection) > 1) {
				anyChanged
					= clearSection(
						sudoku.getCol(blockColIndex + bitIndex(colSection)),
						blockRowIndex,
						number,
					) || anyChanged;
			} else if (bitCount(rowSection) === 1n && bitCount(colSection) > 1) {
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
