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

import type {Sudoku} from '../sudoku.js';

import {BetterMap, eachCandidate} from './shared.js';

function throwIfInvalid(structIndices: number[], indices: number[]): void {
	/*
		[
			[1, 1, 1, ...],
			[1, 1, 1, ...],
			[1, 1, 1, ...],
			[1, 1, 1, ...],
			...
		]
		There's no way to place all 1s
		without duplicates
	*/
	if (structIndices.length > indices.length) {
		throw new Error(
			`Less structIndices than indices: structIndices={${structIndices.join(
				',',
			)}}, indices={${indices.join(',')}} (n fish)`,
		);
	}
}

/* https://www.sudokuonline.io/tips/sudoku-swordfish-strategy */

function nFishByStructure(
	sudoku: Sudoku,
	getterName: 'getRow' | 'getCol',
): void {
	const summary = new BetterMap<
		/* element: */ number,
		BetterMap<
			/* strucIndex */ number,
			{key: bigint; inStructureIndices: number[]}
		>
	>();

	/*
			Index all cell candidates
			For each row / col and each number
			add the index of the number:
			number[`cell candidate`][`row-index`] |= `index in row`
	*/
	for (let structureIndex = 0; structureIndex < sudoku.size; ++structureIndex) {
		const structure = sudoku[getterName](structureIndex);

		for (const [inStructureIndex, cell] of structure.entries()) {
			if (cell.element === undefined) {
				for (const candidate of eachCandidate(structure, cell)) {
					const candidateSummary = summary.getWithDefault(
						candidate,
						() => new BetterMap(),
					);

					const item = candidateSummary.getWithDefault(structureIndex, () => ({
						key: 0n,
						inStructureIndices: [],
					}));

					item.key |= 1n << BigInt(inStructureIndex);
					item.inStructureIndices.push(inStructureIndex);
				}
			}
		}
	}

	for (const [element, elementSummary] of summary) {
		for (const {
			key: keyReference,
			inStructureIndices,
		} of elementSummary.values()) {
			if (inStructureIndices.length === sudoku.size) {
				// eslint-disable-next-line unicorn/no-break-in-nested-loop
				continue;
			}

			const structureIndices: number[] = [];
			for (const [structureIndex, entry] of elementSummary) {
				if ((keyReference & entry.key) === entry.key) {
					structureIndices.push(structureIndex);
				}
			}

			throwIfInvalid(structureIndices, inStructureIndices);

			if (inStructureIndices.length !== structureIndices.length) {
				// eslint-disable-next-line unicorn/no-break-in-nested-loop
				continue;
			}

			for (const inStructureIndex of inStructureIndices) {
				const structure =
					sudoku[getterName === 'getCol' ? 'getRow' : 'getCol'](
						inStructureIndex,
					);

				for (const [structureIndex, cell] of structure.entries()) {
					if (!structureIndices.includes(structureIndex)) {
						sudoku.removeCandidate(cell, element);
					}
				}
			}

			sudoku.emit('change');
		}
	}
}

export function nFish(sudoku: Sudoku): void {
	nFishByStructure(sudoku, 'getRow');
	nFishByStructure(sudoku, 'getCol');
}
