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
		for (const {key: keyRef, inStructureIndices} of elementSummary.values()) {
			if (inStructureIndices.length === sudoku.size) {
				continue;
			}

			const structureIndices: number[] = [];
			for (const [structureIndex, entry] of elementSummary) {
				if ((keyRef & entry.key) === entry.key) {
					structureIndices.push(structureIndex);
				}
			}

			throwIfInvalid(structureIndices, inStructureIndices);

			if (inStructureIndices.length !== structureIndices.length) {
				continue;
			}

			for (const inStructureIndex of inStructureIndices) {
				const structure
					= sudoku[getterName === 'getCol' ? 'getRow' : 'getCol'](
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
