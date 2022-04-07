import type {Sudoku, ReadonlyCells} from '../sudoku.js';
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

		sudoku.removeCandidate(cell, numberToRemove);
	}

	sudoku.emit('change');
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

		for (const [index, {content, candidates}] of block.entries()) {
			const row = BigInt(Math.trunc(index / blockWidth));
			const col = BigInt(index % blockWidth);

			const key = (1n << col) | (1n << (row + blockWidthBigInt));

			if (content === undefined) {
				for (const candidate of candidates) {
					if (block.contents[candidate] === 0) {
						summary.set(candidate, (summary.get(candidate) ?? 0n) | key);
					}
				}
			} else {
				summary.set(content, key);
			}
		}

		const rowOffset = (1n << blockWidthBigInt) - 1n;
		for (const [number, key] of summary) {
			const colSection = key & rowOffset;
			const rowSection = (key >> blockWidthBigInt) & rowOffset;

			if (bitCount(colSection) === 1n) {
				clearSection(
					sudoku.getCol(blockColIndex + bitIndex(colSection)),
					sudoku,
					blockRowIndex,
					number,
				);
			}

			if (bitCount(rowSection) === 1n) {
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
