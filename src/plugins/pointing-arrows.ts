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

import type {Sudoku, Structure} from '../sudoku.js';

import {BetterMap, eachCandidate} from './shared.js';

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
