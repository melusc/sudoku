import type {Sudoku, Structure} from '../sudoku.ts';

import {BetterMap, eachCandidate} from './shared.ts';

function clearSection(
	structure: Structure,
	sudoku: Sudoku,
	blockIndex: number,
	numberToRemove: number,
): void {
	const {blockWidth} = sudoku;

	for (const [index, cell] of structure.entries()) {
		if (index >= blockIndex && index < blockIndex + blockWidth) {
			continue;
		}

		sudoku.removeCandidate(cell, numberToRemove);
	}

	sudoku.emit('change');
}

export function pointingArrows(sudoku: Sudoku): void {
	const {size, blockWidth} = sudoku;

	for (let blockIndex = 0; blockIndex < size; ++blockIndex) {
		const block = sudoku.getBlock(blockIndex);
		const blockRowIndex = Math.trunc(blockIndex / blockWidth) * blockWidth;
		const blockColIndex = (blockIndex % blockWidth) * blockWidth;

		const summary = new BetterMap<
			number,
			{
				row: Set<number>;
				col: Set<number>;
			}
		>();

		for (const [index, cell] of block.entries()) {
			const row = Math.trunc(index / blockWidth);
			const col = index % blockWidth;

			if (cell.element === undefined) {
				for (const candidate of eachCandidate(block, cell)) {
					const item = summary.getWithDefault(candidate, () => ({
						row: new Set(),
						col: new Set(),
					}));
					item.row.add(row);
					item.col.add(col);
				}
			} else {
				summary.set(cell.element, {
					row: new Set([row]),
					col: new Set([col]),
				});
			}
		}

		for (const [number, {row, col}] of summary) {
			if (col.size === 1) {
				clearSection(
					sudoku.getCol(blockColIndex + [...col][0]!),
					sudoku,
					blockRowIndex,
					number,
				);
			}

			if (row.size === 1) {
				clearSection(
					sudoku.getRow(blockRowIndex + [...row][0]!),
					sudoku,
					blockColIndex,
					number,
				);
			}
		}
	}
}
