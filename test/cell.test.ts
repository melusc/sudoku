import test from 'ava';
import {Cell} from '../src/cell.js';

test('Cell should be a class', t => {
	const c = new Cell();
	t.is(typeof c, 'object');

	t.is(c.content, undefined);

	t.deepEqual(c.candidates, new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]));
});

test('Cell#setContent', t => {
	const c = new Cell();

	t.is(c.content, undefined);
	t.is(c.candidates.size, 9);

	c.setContent(1);

	t.is(c.content, 1);
	t.is(c.candidates.size, 0);
});

test('Cell#setValidity', t => {
	let c = new Cell();
	c.setContent(0);
	t.false(c.valid, '"0" is not valid');

	// ====

	c = new Cell();
	c.setContent(1);
	t.true(c.valid, '"1" is valid');
});

test('Cell#clear', t => {
	let c = new Cell();
	c.setContent(3).clear();
	t.is(
		c.content,
		undefined,
		'Resetting an invalid cell should reset content to undefined',
	);
	t.is(
		c.candidates.size,
		9,
		'Resetting an invalid cell should reset candidates to "Set(1..9)"',
	);
	t.true(c.valid, 'Resetting an invalid cell should reset valid to true');

	// ====
	c = new Cell();
	c.setContent(1).clear();
	t.is(
		c.content,
		undefined,
		'Resetting a valid cell should reset content to undefined',
	);
	t.is(
		c.candidates.size,
		9,
		'Resetting a valid cell should reset candidates to "Set(1..9)"',
	);
	t.true(c.valid, 'Resetting a valid cell should keep valid at true');
});
