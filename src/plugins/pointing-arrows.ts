import type {ReadonlyCells} from '../cell.js';
import type {Sudoku} from '../sudoku.js';
import {bitCount, bitIndex} from './shared.js';

const clearSection = (
	structure: ReadonlyCells,
	sudoku: Sudoku,
	blockIndex: number,
	numberToRemove: number,
): void => {
	const {blockWidth} = sudoku;

	for (const [index, cell] of structure.entries()) {
		if (index >= blockIndex && index < blockIndex + blockWidth) {
			continue;
		}

		sudoku.removePossible(cell, numberToRemove);
	}
};

export const pointingArrows = (sudoku: Sudoku): void => {
	const {size, blockWidth} = sudoku;
	const blockWidthBigInt = BigInt(blockWidth);

	for (let blockIndex = 0; blockIndex < size; ++blockIndex) {
		const block = sudoku.getBlock(blockIndex);
		const blockRowIndex = Math.trunc(blockIndex / blockWidth) * blockWidth;
		const blockColIndex = (blockIndex % blockWidth) * blockWidth;

		/*
      The first three bits are for cols
      The last three are for rows

      If one of the sections has only one bit,
      that is a pointing arrow
    */
		const summary = new Map<number, bigint>();

		for (const [index, {content, possible}] of block.entries()) {
			const row = BigInt(Math.trunc(index / blockWidth));
			const col = BigInt(index % blockWidth);

			const key = (1n << col) | (1n << (row + blockWidthBigInt));

			if (content === undefined) {
				for (const number of possible) {
					summary.set(number, (summary.get(number) ?? 0n) | key);
				}
			} else {
				summary.set(content, (summary.get(content) ?? 0n) | key);
			}
		}

		const rowOffset = (1n << blockWidthBigInt) - 1n;
		for (const [number, key] of summary) {
			const colSection = key & rowOffset;
			const rowSection = (key >> blockWidthBigInt) & rowOffset;

			if (bitCount(colSection) === 1n && bitCount(rowSection) > 1) {
				clearSection(
					sudoku.getCol(blockColIndex + bitIndex(colSection)),
					sudoku,
					blockRowIndex,
					number,
				);
			} else if (bitCount(rowSection) === 1n && bitCount(colSection) > 1) {
				clearSection(
					sudoku.getRow(blockRowIndex + bitIndex(rowSection)),
					sudoku,
					blockColIndex,
					number,
				);
			}
		}
	}
};
