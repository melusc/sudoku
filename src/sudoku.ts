import {ReadonlyDeep} from 'type-fest';

import {
	Cell,
	generateEmptyCellPossibles,
	type Cells,
	type ReadonlyCells,
} from './cell.js';
import * as plugins from './plugins/plugins.js';

type NumberOnlySudoku = Array<Array<number | undefined>>;

type DispatchTypes = 'change' | 'error' | 'finish';
export type SubscriptionCallback = (
	sudoku: Sudoku,
	type: DispatchTypes,
) => void;

export const inRangeIncl = (low: number, high: number, n: number): void => {
	if (!Number.isInteger(n)) {
		throw new TypeError(`${n} was not an integer.`);
	}

	if (n < low || n > high) {
		throw new RangeError(`${n} ∉ [${low}, ${high}].`);
	}
};

enum SolveTypes {
	changed,
	unchanged,
	error,
}

export class Sudoku {
	#subscriptions: Set<SubscriptionCallback> = new Set();

	#plugins: Array<(sudoku: Sudoku) => boolean> = Object.values(plugins);

	#cachedCols = new Map<number, ReadonlyCells>();
	#cachedRows = new Map<number, ReadonlyCells>();
	#cachedBlocks = new Map<number, ReadonlyCells>();

	private readonly cells: ReadonlyCells;

	constructor(array?: ReadonlyDeep<NumberOnlySudoku>) {
		this.cells = Array.from({length: 81}, () => new Cell());

		if (array) {
			for (const [rowIndex, row] of array.entries()) {
				for (const [colIndex, cell] of row.entries()) {
					if (cell !== undefined) {
						// prettier-ignore
						this.setContent((rowIndex * 9) + colIndex, cell);
					}
				}
			}
		}
	}

	setContent = (index: number, content: string | number): this => {
		inRangeIncl(0, 80, index);

		const cell = this.cells[index]!; // It's [0,80]

		cell.setContent(content);

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	getContent = (index: number): string | undefined => {
		inRangeIncl(0, 80, index);

		// It's [0,80]
		return this.cells[index]!.content;
	};

	clearCell = (index: number): this => {
		const cell = this.getCell(index);
		cell.customValid = true;
		cell.clear();

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	clearAllCells = (): this => {
		for (const cell of this.cells) {
			cell.clear();
			cell.customValid = true;
		}

		return this.#dispatch('change');
	};

	getCol = (col: number): ReadonlyCells => {
		inRangeIncl(0, 8, col);

		const cachedCols = this.#cachedCols;

		if (cachedCols.has(col)) {
			return cachedCols.get(col)!;
		}

		const result: Cells = [];

		for (let index = col; index < 81; index += 9) {
			result.push(this.cells[index]!);
		}

		cachedCols.set(col, result);

		return result;
	};

	getRow = (row: number): ReadonlyCells => {
		inRangeIncl(0, 8, row);

		const cachedRows = this.#cachedRows;

		if (cachedRows.has(row)) {
			return cachedRows.get(row)!;
		}

		// prettier-ignore
		const result = this.cells.slice(row * 9, (row * 9) + 9);

		cachedRows.set(row, result);
		return result;
	};

	getBlock = (index: number): ReadonlyCells => {
		inRangeIncl(0, 8, index);

		const cachedBlocks = this.#cachedBlocks;
		if (cachedBlocks.has(index)) {
			return cachedBlocks.get(index)!;
		}

		const colOffset = (index % 3) * 3;
		const rowOffset = Math.floor(index / 3) * 3;

		const result = [];

		for (let index_ = 0; index_ < 9; ++index_) {
			const row = (rowOffset + Math.floor(index_ / 3)) * 9;
			const col = colOffset + (index_ % 3);

			result.push(this.getCell(row + col));
		}

		cachedBlocks.set(index, result);

		return result;
	};

	getCell = (index: number): Cell => {
		inRangeIncl(0, 80, index);

		return this.cells[index]!; // It's [0,80]
	};

	getCells = (): ReadonlyCells => this.cells;

	#singleSolve = (): SolveTypes => {
		let anyChanged = false;

		for (const plugin of this.#plugins) {
			try {
				anyChanged = plugin(this) || anyChanged;
			} catch (error: unknown) {
				if (process.env['NODE_ENV'] !== 'test') {
					console.error(error, this.cells);
				}

				return SolveTypes.error;
			}
		}

		for (const [index, cell] of this.cells.entries()) {
			if (cell.content !== undefined) {
				continue;
			}

			if (cell.possible.size === 1) {
				// We know that the set has one item
				cell.setContent(cell.possible.values().next().value as string);
			} else if (cell.possible.size === 0) {
				if (process.env['NODE_ENV'] !== 'test') {
					console.error('cell.possible.size === 0', [index, cell]);
				}

				return SolveTypes.error;
			}
		}

		return anyChanged ? SolveTypes.changed : SolveTypes.unchanged;
	};

	solve = (): this => {
		if (!this.isValid()) {
			this.#dispatch('error');
			return this;
		}

		for (const cell of this.cells) {
			if (cell.content === undefined) {
				cell.clear(); // Reset possibles
			}
		}

		let shouldContinue: SolveTypes;

		do {
			shouldContinue = this.#singleSolve();
		} while (shouldContinue === SolveTypes.changed);

		this.#dispatch(
			shouldContinue === SolveTypes.unchanged ? 'finish' : 'error',
		);

		return this;
	};

	subscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.add(callback);

		return this;
	};

	unsubscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.delete(callback);

		return this;
	};

	#dispatch = (type: DispatchTypes): this => {
		for (const callback of this.#subscriptions) {
			callback(this, type);
		}

		return this;
	};

	* eachStructure(): Iterable<ReadonlyCells> {
		for (let i = 0; i < 9; ++i) {
			for (const structureGetter of [this.getCol, this.getRow, this.getBlock]) {
				yield structureGetter(i);
			}
		}
	}

	cellsIndividuallyValidByStructure = (): boolean => {
		for (const cell of this.cells) {
			cell.customValid = true;
		}

		for (const structure of this.eachStructure()) {
			this._setValiditiesByStructure(structure);
		}

		for (const [index, cell] of this.cells.entries()) {
			if (!cell.valid) {
				if (process.env['NODE_ENV'] !== 'test') {
					console.error('cell was not valid', [index, cell]);
				}

				return false;
			}
		}

		return true;
	};

	isValid = (): boolean => {
		for (const structure of this.eachStructure()) {
			const requiredNumbers = generateEmptyCellPossibles();

			for (const cell of structure) {
				if (cell.content === undefined) {
					for (const possible of cell.possible) {
						requiredNumbers.delete(possible);
					}
				} else {
					requiredNumbers.delete(cell.content);
				}
			}

			if (requiredNumbers.size > 0) {
				if (process.env['NODE_ENV'] !== 'test') {
					console.error('dict.size > 0: %o', requiredNumbers);
				}

				return false;
			}
		}

		return this.cellsIndividuallyValidByStructure();
	};

	_setValiditiesByStructure = (structure: ReadonlyCells): this => {
		const found = new Map<string, Cell>();

		// For every content add the cell to `found`
		// If a second cell is found, that means that there are duplicates
		// so both are invalid

		for (const cell of structure) {
			const {content} = cell;

			if (typeof content === 'string') {
				const previousCell = found.get(content);

				if (previousCell) {
					previousCell.customValid = false;
					cell.customValid = false;
				} else {
					found.set(content, cell);
				}
			}
		}

		return this;
	};

	isSolved = (): boolean => {
		if (!this.cellsIndividuallyValidByStructure()) {
			return false;
		}

		for (const cell of this.cells) {
			if (cell.content === undefined) {
				return false;
			}
		}

		return true;
	};
}
