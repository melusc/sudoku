let counter = 0;
const uniqueId = (prefix = ''): string => `${prefix}${counter++}`;

export type Cells = Cell[];
export type ReadonlyCells = readonly Cell[];

export const generateEmptyCellPossibles = (): Set<number> =>
	new Set(Array.from({length: 9}, (_v, index) => index + 1));

export class Cell {
	#content: number | undefined;

	possible = generateEmptyCellPossibles();

	key = uniqueId('cell-');

	customValid = true;

	constructor(private readonly sudokuSize = 9) {}

	get content(): number | undefined {
		return this.#content;
	}

	get valid(): boolean {
		const content = this.#content;

		return (
			this.customValid
			&& (content === undefined
				? this.possible.size > 0
				: Number.isInteger(content)
				  && content > 0
				  && content <= this.sudokuSize)
		);
	}

	setContent = (content?: number): this => {
		if (content === undefined) {
			this.clear();
		} else {
			this.#content = content;
			this.possible.clear();
		}

		return this;
	};

	clear = (): this => {
		this.#content = undefined;

		this.possible = generateEmptyCellPossibles();

		return this;
	};
}
