import {
	Cell,
	type Cells,
	generateEmptyCellCandidates,
	type ReadonlyCells,
} from './cell.js';
import * as plugins from './plugins/index.js';

type PrefilledSudoku = ReadonlyArray<
	undefined | ReadonlyArray<string | number | readonly number[] | undefined>
>;

type DispatchType = 'change' | 'error' | 'finish';
export type SubscriptionCallback = (sudoku: Sudoku, type: DispatchType) => void;

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

const makeStructureCacher = <T = unknown, R = unknown>(
	fn: (arg0: T) => R,
): ((arg0: T) => R) => {
	const cache = new Map<T, R>();
	return (arg: T): R => {
		if (cache.has(arg)) {
			return cache.get(arg)!;
		}

		const result = fn(arg);
		cache.set(arg, result);

		return result;
	};
};

// Because Array.isArray on its own won't narrow it down otherwise
const isReadonlyArray = (arg0: any): arg0 is readonly any[] =>
	Array.isArray(arg0);

export class Sudoku {
	static readonly alphabet: readonly string[] = [
		...'1234567890abcdefghijklmnopqrstuvwxyz',
	];

	static fromPrefilled = (cells: PrefilledSudoku, size: number): Sudoku => {
		const s = new Sudoku(size);

		for (const [rowIndex, row] of cells.entries()) {
			if (!row) {
				continue;
			}

			for (const [colIndex, content] of row.entries()) {
				// prettier-ignore
				const cellIndex = (rowIndex * size) + colIndex;
				const cell = s.getCell(cellIndex);
				if (isReadonlyArray(content)) {
					cell.candidates = new Set(content);
				} else if (content !== undefined) {
					s.setContent(cellIndex, content);
				}
			}
		}

		s.anyChanged = false;
		return s;
	};

	readonly #subscriptions: Set<SubscriptionCallback> = new Set();

	readonly #plugins: Array<(sudoku: Sudoku) => void> = Object.values(plugins);

	/** @internal */
	anyChanged = false;

	/** @internal */
	readonly amountCells: number;

	/** @internal */
	readonly blockWidth: number;

	readonly #cells: ReadonlyCells;

	shouldLogErrors = process.env['NODE_ENV'] !== 'test';

	mode: 'thorough' | 'fast' = 'thorough';

	constructor(readonly size: number) {
		const blockWidth = Math.sqrt(size);

		if (!Number.isInteger(blockWidth)) {
			throw new TypeError('Expected size to be a square of an integer.');
		}

		this.blockWidth = blockWidth;

		const amountCells = size ** 2;
		this.amountCells = amountCells;
		this.#cells = Array.from({length: amountCells}, () => new Cell(size));
	}

	setContent = (index: number, content: string | number): this => {
		inRangeIncl(0, this.amountCells - 1, index);

		const cell = this.#cells[index]!;

		if (typeof content === 'number') {
			if (Number.isInteger(content)) {
				cell.setContent(content);
			} else {
				cell.clear();
			}
		} else {
			const index = Sudoku.alphabet.indexOf(content.toLowerCase());
			if (index === -1) {
				cell.clear();
			} else {
				cell.setContent(index + 1);
			}
		}

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	getContent = (index: number): number | undefined => {
		inRangeIncl(0, this.amountCells - 1, index);

		return this.#cells[index]!.content;
	};

	clearCell = (index: number): this => {
		const cell = this.getCell(index);
		cell.customValid = true;
		cell.clear();

		this.cellsIndividuallyValidByStructure();

		return this.#dispatch('change');
	};

	clearAllCells = (): this => {
		for (const cell of this.#cells) {
			cell.clear();
			cell.customValid = true;
		}

		return this.#dispatch('change');
	};

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getCol = makeStructureCacher((col: number): ReadonlyCells => {
		inRangeIncl(0, this.size - 1, col);

		const result: Cells = [];

		for (let index = col; index < this.amountCells; index += this.size) {
			result.push(this.#cells[index]!);
		}

		return result;
	});

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getRow = makeStructureCacher((row: number): ReadonlyCells => {
		inRangeIncl(0, this.size - 1, row);

		return this.#cells.slice(row * this.size, (1 + row) * this.size);
	});

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getBlock = makeStructureCacher((index: number): ReadonlyCells => {
		const {size, blockWidth} = this;

		inRangeIncl(0, size - 1, index);

		const colOffset = (index % blockWidth) * blockWidth;
		const rowOffset = Math.floor(index / blockWidth) * blockWidth;

		const result: Cells = [];

		for (let index_ = 0; index_ < size; ++index_) {
			const row = rowOffset + Math.floor(index_ / blockWidth);
			const col = colOffset + (index_ % blockWidth);

			// prettier-ignore
			result.push(this.getCell((row * size) + col));
		}

		return result;
	});

	getCell = (index: number): Cell => {
		inRangeIncl(0, this.amountCells - 1, index);

		return this.#cells[index]!;
	};

	getCells = (): ReadonlyCells => this.#cells;

	/** @internal */
	#checkCellCandidates = (cell: Cell): this => {
		if (cell.content !== undefined) {
			return this;
		}

		if (cell.candidates.size === 0) {
			throw new Error(
				`Unexpected empty cell candidates in cell #${this.#cells.indexOf(
					cell,
				)}`,
			);
		}

		if (cell.candidates.size === 1) {
			cell.setContent(cell.candidates.values().next().value as number);
			this.anyChanged ||= true;
			this.#dispatch('change');
		}

		return this;
	};

	/** @internal */
	removeCandidate = (cell: Cell, toRemove: number): this => {
		const {candidates} = cell;

		if (candidates.has(toRemove)) {
			this.anyChanged ||= true;
			candidates.delete(toRemove);

			this.#checkCellCandidates(cell);
		}

		return this;
	};

	/** @internal */
	overrideCandidates = (cell: Cell, candidates: Set<number>): this => {
		let anyChanged = false;
		for (const candidate of cell.candidates) {
			if (!candidates.has(candidate)) {
				cell.candidates.delete(candidate);
				anyChanged ||= true;
			}
		}

		if (anyChanged) {
			this.anyChanged ||= true;
			this.#checkCellCandidates(cell);
		}

		return this;
	};

	#singleSolve = (): SolveTypes => {
		this.anyChanged = false;

		for (const plugin of this.#plugins) {
			try {
				plugin(this);
			} catch (error: unknown) {
				this.logError(error, this.#cells);

				return SolveTypes.error;
			}
		}

		return this.anyChanged ? SolveTypes.changed : SolveTypes.unchanged;
	};

	solve = (): DispatchType => {
		if (!this.isValid()) {
			this.#dispatch('error');
			return 'error';
		}

		for (const cell of this.#cells) {
			if (cell.content === undefined) {
				cell.clear(); // Reset candidates
			}
		}

		let shouldContinue: SolveTypes;

		do {
			shouldContinue = this.#singleSolve();
		} while (shouldContinue === SolveTypes.changed);

		let dispatchType: DispatchType;
		if (shouldContinue === SolveTypes.error) {
			dispatchType = 'error';
		} else if (this.isSolved()) {
			dispatchType = 'finish';
		} else {
			dispatchType = 'change';
		}

		this.#dispatch(dispatchType);
		return dispatchType;
	};

	subscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.add(callback);

		return this;
	};

	unsubscribe = (callback: SubscriptionCallback): this => {
		this.#subscriptions.delete(callback);

		return this;
	};

	#dispatch = (type: DispatchType): this => {
		for (const callback of this.#subscriptions) {
			callback(this, type);
		}

		return this;
	};

	* eachStructure(): Iterable<ReadonlyCells> {
		for (const structureGetter of [this.getCol, this.getRow, this.getBlock]) {
			for (let i = 0; i < this.size; ++i) {
				yield structureGetter(i);
			}
		}
	}

	/** @internal */
	cellsIndividuallyValidByStructure = (): boolean => {
		for (const cell of this.#cells) {
			cell.customValid = true;
		}

		for (const structure of this.eachStructure()) {
			this._setValiditiesByStructure(structure);
		}

		for (const [index, cell] of this.#cells.entries()) {
			if (!cell.valid) {
				this.logError('cell was not valid', [index, cell]);

				return false;
			}
		}

		return true;
	};

	isValid = (): boolean => {
		for (const structure of this.eachStructure()) {
			const requiredNumbers = generateEmptyCellCandidates(this.size);

			for (const cell of structure) {
				if (cell.content === undefined) {
					for (const candidate of cell.candidates) {
						requiredNumbers.delete(candidate);
					}
				} else {
					requiredNumbers.delete(cell.content);
				}
			}

			if (requiredNumbers.size > 0) {
				this.logError('dict.size > 0: %o', requiredNumbers);

				return false;
			}
		}

		return this.cellsIndividuallyValidByStructure();
	};

	/** @internal */
	_setValiditiesByStructure = (structure: ReadonlyCells): this => {
		const found = new Map<number, Cell>();

		// For every content add the cell to `found`
		// If a second cell is found, that means that there are duplicates
		// so both are invalid

		for (const cell of structure) {
			const {content} = cell;

			if (content !== undefined) {
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

		for (const cell of this.#cells) {
			if (cell.content === undefined) {
				return false;
			}
		}

		return true;
	};

	toPrefilledSudoku = (): PrefilledSudoku => {
		const rows: Array<Array<number | number[]>> = [];

		for (let i = 0; i < this.size; ++i) {
			const row = this.getRow(i);
			const resultingRow: Array<number | number[]> = [];
			rows.push(resultingRow);

			for (const cell of row) {
				if (cell.content === undefined) {
					resultingRow.push([...cell.candidates]);
				} else {
					resultingRow.push(cell.content);
				}
			}
		}

		return rows;
	};

	clone = (): Sudoku => {
		const newSudoku = Sudoku.fromPrefilled(this.toPrefilledSudoku(), this.size);
		newSudoku.shouldLogErrors = this.shouldLogErrors;
		newSudoku.mode = this.mode;
		return newSudoku;
	};

	logError = (message: any, ...data: any[]): void => {
		if (this.shouldLogErrors) {
			console.error(message, ...data);
		}
	};
}
