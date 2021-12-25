let counter = 0;
const uniqueId = (prefix = '') => `${prefix}${counter++}`;

export type Cells = Cell[];

const emptyCellPossibles = (): Set<string> =>
	new Set(Array.from({length: 9}, (_v, index) => `${index + 1}`));

export class Cell {
	content: string | undefined;

	possible = emptyCellPossibles();

	key = uniqueId('cell-');

	private customValid = true;

	get valid(): boolean {
		return (
			this.customValid
			&& (typeof this.content === 'undefined'
				? this.possible.size > 0
				: /^[1-9]$/.test(this.content))
		);
	}

	set valid(validity: boolean | undefined) {
		this.customValid = validity ?? true;
	}

	setContent = (content: string): this => {
		content = content.trim();

		if (content) {
			this.content = content.trim();
			this.possible.clear();
		} else {
			this.clear();
		}

		return this;
	};

	clear = (): this => {
		this.content = undefined;

		this.possible = emptyCellPossibles();

		return this;
	};
}
