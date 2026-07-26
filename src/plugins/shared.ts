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

import type {Sudoku, Structure, Cell} from '../sudoku.js';

export type VisitorFunction = (structure: Structure, sudoku: Sudoku) => void;
export function makeVisitor(
	callback: VisitorFunction,
): (sudoku: Sudoku) => void {
	return (sudoku: Sudoku): void => {
		for (const structure of sudoku.eachStructure()) {
			callback(structure, sudoku);
		}
	};
}

export function* eachCandidate(
	structure: Structure,
	cell: Cell,
): Iterable<number> {
	for (const candidate of cell.candidates) {
		if (structure.elements[candidate] === 0) {
			yield candidate;
		}
	}
}

export class BetterMap<K, V> extends Map<K, V> {
	getWithDefault(key: K, defaultFactory: () => V): V {
		if (!this.has(key)) {
			this.set(key, defaultFactory());
		}

		return this.get(key)!;
	}
}
