import * as plugins from './plugins/index.js';

export type Cell = {
	element: number | undefined;
	candidates: Set<number>;
	readonly index: number;
};
export type ReadonlyCells = readonly Cell[];

export type Structure = ReadonlyCells & {elements: Record<number, number>};

export type PrefilledSudoku = ReadonlyArray<
	undefined | ReadonlyArray<string | number | readonly number[] | undefined>
>;

export type JsonSudoku = ReadonlyArray<number | readonly number[]>;

type DispatchType = 'change' | 'error' | 'finish';
export type SubscriptionCallback = (sudoku: Sudoku, type: DispatchType) => void;

export function inRangeIncl(
	n: number,
	low: number,
	high: number,
	format?: (n: number, low: number, high: number) => string,
): void {
	if (!Number.isInteger(n) || n < low || n > high) {
		throw new TypeError(
			format?.(n, low, high)
				?? `Received "${n}", expected an integer ${low} <= n <= ${high}.`,
		);
	}
}

enum SolveTypes {
	changed,
	unchanged,
	error,
}

function generateEmptyCellCandidates(size: number): Set<number> {
	return new Set(Array.from({length: size}, (_v, index) => index));
}

// Using a proxy means there's no need to check for undefined every single time, only check it once here
// It also allows to simply do `elements[number]++` without checking for undefined
function makeElementsRecord(): Record<number, number> {
	return new Proxy<Record<number, number>>(
		{},
		{
			get(target, key): number {
				return (Reflect.get(target, key) as number | undefined) ?? 0;
			},
			set(target, key: string, value): boolean {
				if (value < 0) {
					throw new Error(`${key}, value < 0`);
				}

				if (value === 0) {
					return Reflect.deleteProperty(target, key);
				}

				return Reflect.set(target, key, value);
			},
		},
	);
}

const makeStructureCacher = (
	function_: (index: number) => ReadonlyCells,
): ((index: number) => Structure) => {
	const cache = new Map<number, Structure>();
	return (index: number): Structure => {
		if (cache.has(index)) {
			return cache.get(index)!;
		}

		const result = function_(index);

		const elements = makeElementsRecord();

		for (const {element} of result) {
			if (element !== undefined) {
				++elements[element];
			}
		}

		const merged = Object.assign(result, {elements});
		cache.set(index, merged);

		return merged;
	};
};

// Because Array.isArray on its own won't narrow it down otherwise
const isReadonlyArray: (argument0: any) => argument0 is readonly any[] = Array.isArray;

export class Sudoku {
	static readonly alphabet: readonly string[] = [
		...'1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ',
	];

	static fromPrefilled(cells: PrefilledSudoku, size: number): Sudoku {
		const s = new Sudoku(size);

		for (const [rowIndex, row] of cells.entries()) {
			// Even though it would also throw in s.getCell
			// this throws a more useful error
			inRangeIncl(
				rowIndex,
				0,
				size - 1,
				(n, low, high) =>
					`Unexpected row #${n}, expected ${low} <= n <= ${high}.`,
			);

			if (!row) {
				continue;
			}

			for (const [colIndex, element] of row.entries()) {
				inRangeIncl(
					colIndex,
					0,
					size - 1,
					(n, low, high) =>
						`Unxpected col #${n}, expected ${low} <= n <= ${high}.`,
				);

				// prettier-ignore
				const cellIndex = (rowIndex * size) + colIndex;
				const cell = s.getCell(cellIndex);
				if (isReadonlyArray(element)) {
					for (const candidate of element) {
						inRangeIncl(
							candidate,
							0,
							size - 1,
							(n, low, high) =>
								`Unxpected candidate ${n} at cell #${cellIndex}, expected an integer ${low} <= n <= ${high}.`,
						);
					}

					cell.candidates = new Set(element);
				} else if (element !== undefined) {
					s.setElement(cell, element);
				}
			}
		}

		s.anyChanged = false;
		return s;
	}

	static fromString(input: string, size: number): Sudoku {
		const sudoku = new Sudoku(size);

		for (let i = 0; i < input.length; ++i) {
			const char = input.charAt(i);
			if (char !== ' ') {
				sudoku.setElement(i, input.charAt(i));
			}
		}

		return sudoku;
	}

	static fromJson(input: JsonSudoku, size: number): Sudoku {
		const sudoku = new Sudoku(size);

		for (const [index, item] of input.entries()) {
			if (isReadonlyArray(item)) {
				for (const candidate of item) {
					inRangeIncl(
						candidate,
						0,
						size - 1,
						(n, low, high) =>
							`Expected candidate "${n}" at cell #${index} to be ${low} <= n <= ${high}.`,
					);
				}

				sudoku.overrideCandidates(index, new Set(item));
			} else {
				sudoku.setElement(index, item);
			}
		}

		return sudoku;
	}

	/** @internal */
	anyChanged = false;
	rounds = 0;

	shouldLogErrors
		// eslint-disable-next-line n/prefer-global/process
		= typeof process === 'undefined' || process.env['NODE_ENV'] !== 'test';

	/** @internal */
	readonly amountCells: number;

	/** @internal */
	readonly blockWidth: number;

	readonly #subscriptions = new Set<SubscriptionCallback>();

	readonly #plugins: Array<(sudoku: Sudoku) => void> = Object.values(plugins);

	readonly #cells: ReadonlyCells;

	constructor(readonly size: number) {
		const blockWidth = Math.sqrt(size);

		if (!Number.isInteger(blockWidth)) {
			throw new TypeError('Expected size to be a square of an integer.');
		}

		if (size <= 0) {
			throw new TypeError(`Expected size (${size}) to be greater than 0.`);
		}

		this.blockWidth = blockWidth;

		const amountCells = size ** 2;
		this.amountCells = amountCells;
		this.#cells = Array.from({length: amountCells}, (_v, index) => ({
			element: undefined,
			candidates: generateEmptyCellCandidates(size),
			index,
		}));
	}

	setElement(cellOrIndex: number | Cell, element: string | number): this {
		const cell = this.getCell(cellOrIndex);

		if (typeof element === 'string') {
			const index = Sudoku.alphabet.indexOf(element.toUpperCase());

			// Throw on not found
			// Throw on invalid for this size
			inRangeIncl(
				index,
				0,
				this.size - 1,
				() => `Unexpected element "${element.toUpperCase()}".`,
			);

			return this.setElement(cell, index);
		}

		inRangeIncl(
			element,
			0,
			this.size - 1,
			(n, low, high) =>
				`Unexpected element "${n}", expected an integer ${low} <= n <= ${high}.`,
		);

		const previousElement = cell.element;

		cell.candidates.clear();

		for (const {elements} of this.getStructuresOfCell(cell)) {
			++elements[element];

			if (previousElement !== undefined) {
				--elements[previousElement];
			}
		}

		// If the structure is uninitialised elements will be updated there
		// if it is initialised it won't be updated there
		// Therefore always update it after getStructuresOfCell
		cell.element = element;

		return this.emit('change');
	}

	getElement(cellOrIndex: number | Cell): string | undefined {
		const {element} = this.getCell(cellOrIndex);

		if (element === undefined) {
			return element;
		}

		return Sudoku.alphabet[element];
	}

	clearCell(index: number | Cell): this {
		const cell = this.getCell(index);
		const {element} = cell;

		if (element !== undefined) {
			for (const structure of this.getStructuresOfCell(cell)) {
				--structure.elements[element];
			}
		}

		cell.element = undefined;
		cell.candidates = generateEmptyCellCandidates(this.size);

		return this.emit('change');
	}

	clearAllCells(): this {
		for (const cell of this.#cells) {
			this.clearCell(cell);
		}

		return this.emit('change');
	}

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getCol = makeStructureCacher((col: number): ReadonlyCells => {
		inRangeIncl(col, 0, this.size - 1);

		const result: Cell[] = [];

		for (let index = col; index < this.amountCells; index += this.size) {
			result.push(this.getCell(index));
		}

		return result;
	});

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getRow = makeStructureCacher((row: number): ReadonlyCells => {
		inRangeIncl(row, 0, this.size - 1);

		return this.#cells.slice(row * this.size, (1 + row) * this.size);
	});

	// eslint-disable-next-line @typescript-eslint/member-ordering
	getBlock = makeStructureCacher((index: number): ReadonlyCells => {
		const {size, blockWidth} = this;

		inRangeIncl(index, 0, size - 1);

		const colOffset = (index % blockWidth) * blockWidth;
		const rowOffset = Math.floor(index / blockWidth) * blockWidth;

		const result: Cell[] = [];

		for (let index_ = 0; index_ < size; ++index_) {
			const row = rowOffset + Math.floor(index_ / blockWidth);
			const col = colOffset + (index_ % blockWidth);

			// prettier-ignore
			result.push(this.getCell((row * size) + col));
		}

		return result;
	});

	getCell(index: number | Cell): Cell {
		if (typeof index === 'number') {
			inRangeIncl(index, 0, this.amountCells - 1);

			return this.#cells[index]!;
		}

		return index;
	}

	getCells(): ReadonlyCells {
		return this.#cells;
	}

	/** @internal */
	removeCandidate(cellOrIndex: number | Cell, toRemove: number): this {
		const {candidates} = this.getCell(cellOrIndex);

		if (candidates.has(toRemove)) {
			this.anyChanged ||= true;
			candidates.delete(toRemove);

			this.#checkCellCandidates(cellOrIndex);
		}

		return this;
	}

	/** @internal */
	overrideCandidates(
		cellOrIndex: number | Cell,
		candidates: Set<number>,
	): this {
		const cell = this.getCell(cellOrIndex);

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
	}

	solve(): DispatchType {
		this.rounds = 0;

		if (!this.isValid()) {
			this.emit('error');
			return 'error';
		}

		for (const cell of this.#cells) {
			if (cell.element === undefined) {
				this.clearCell(cell); // Reset candidates
			}
		}

		let shouldContinue: SolveTypes;
		do {
			++this.rounds;
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

		this.emit(dispatchType);
		return dispatchType;
	}

	subscribe(callback: SubscriptionCallback): this {
		this.#subscriptions.add(callback);

		return this;
	}

	unsubscribe(callback: SubscriptionCallback): this {
		this.#subscriptions.delete(callback);

		return this;
	}

	/** @internal */
	emit(type: DispatchType): this {
		for (const callback of this.#subscriptions) {
			callback(this, type);
		}

		return this;
	}

	* eachStructure(): Iterable<Structure> {
		for (const structureGetter of [this.getCol, this.getRow, this.getBlock]) {
			for (let i = 0; i < this.size; ++i) {
				yield structureGetter(i);
			}
		}
	}

	/** @internal */
	cellsIndividuallyValid(): boolean {
		for (const cell of this.#cells) {
			if (!this.isCellValid(cell)) {
				this.logError('cell was not valid', [cell]);

				return false;
			}
		}

		return true;
	}

	/** @internal */
	* getStructuresOfCell(cellOrIndex: number | Cell): Iterable<Structure> {
		const cell = this.getCell(cellOrIndex);

		const {index} = cell;

		const colIndex = index % this.size;
		const rowIndex = Math.floor(index / this.size);
		// prettier-ignore
		const blockIndex
			= Math.floor(colIndex / this.blockWidth)
			+ (Math.floor(rowIndex / this.blockWidth) * this.blockWidth);

		yield this.getCol(colIndex);
		yield this.getRow(rowIndex);
		yield this.getBlock(blockIndex);
	}

	isCellValid(cellOrIndex: number | Cell): boolean {
		const cell = this.getCell(cellOrIndex);

		// Invalid cases:
		//   cell.element === undefined && cell.candidates.size === 0
		//   cell.element !== undefined && cell.candidates.size > 0
		if ((cell.element === undefined) === (cell.candidates.size === 0)) {
			return false;
		}

		const {element} = cell;

		if (element === undefined) {
			return true;
		}

		for (const {elements} of this.getStructuresOfCell(cell)) {
			if (elements[element]! > 1) {
				return false;
			}
		}

		return true;
	}

	isValid(): boolean {
		for (const structure of this.eachStructure()) {
			const requiredNumbers = generateEmptyCellCandidates(this.size);

			for (const cell of structure) {
				if (cell.element === undefined) {
					for (const candidate of cell.candidates) {
						requiredNumbers.delete(candidate);
					}
				} else {
					requiredNumbers.delete(cell.element);
				}
			}

			if (requiredNumbers.size > 0) {
				this.logError('dict.size > 0: %o', requiredNumbers);

				return false;
			}
		}

		return this.cellsIndividuallyValid();
	}

	isSolved(): boolean {
		if (!this.isValid()) {
			return false;
		}

		for (const cell of this.#cells) {
			if (cell.element === undefined) {
				return false;
			}
		}

		return true;
	}

	toPrefilledSudoku(): PrefilledSudoku {
		const rows: Array<Array<number | number[]>> = [];

		for (let i = 0; i < this.size; ++i) {
			const row = this.getRow(i);
			const resultingRow: Array<number | number[]> = [];
			rows.push(resultingRow);

			for (const cell of row) {
				if (cell.element === undefined) {
					resultingRow.push([...cell.candidates]);
				} else {
					resultingRow.push(cell.element);
				}
			}
		}

		return rows;
	}

	toString(): string {
		const result: string[] = [];

		for (const cell of this.getCells()) {
			result.push(this.getElement(cell) ?? ' ');
		}

		return result.join('');
	}

	clone(): Sudoku {
		const newSudoku = Sudoku.fromPrefilled(this.toPrefilledSudoku(), this.size);
		newSudoku.shouldLogErrors = this.shouldLogErrors;
		return newSudoku;
	}

	logError(message: any, ...data: any[]): void {
		if (this.shouldLogErrors) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
			console.error(message, ...data);
		}
	}

	toJson(): JsonSudoku {
		return this.getCells().map(
			({candidates, element}) => element ?? [...candidates],
		);
	}

	#singleSolve(): SolveTypes {
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
	}

	/** @internal */
	#checkCellCandidates(cellOrIndex: number | Cell): this {
		const cell = this.getCell(cellOrIndex);

		if (cell.element !== undefined) {
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
			const [element] = cell.candidates;
			this.setElement(cell, element!);
			this.anyChanged ||= true;
			this.emit('change');
		}

		return this;
	}
}
