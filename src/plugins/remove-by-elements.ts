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

import {makeVisitor} from './shared.js';

export const removeByElements = makeVisitor((structure, sudoku) => {
	const elements = Object.keys(structure.elements);

	for (const cell of structure) {
		if (cell.element !== undefined) {
			continue;
		}

		for (const element of elements) {
			sudoku.removeCandidate(cell, Number(element));
		}

		sudoku.emit('change');
	}
});
