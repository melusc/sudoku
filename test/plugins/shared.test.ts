import test from 'ava';
import {bitCount, bitIndex} from '../../src/plugins/shared.js';

test('bitCount 8 should return 1.', t => {
	t.is(bitCount(8), 1);
});

test('bitCount 7 should return 3.', t => {
	t.is(bitCount(7), 3);
});

test('bitIndex 2 should return 1.', t => {
	t.is(bitIndex(2), 1);
});

test('bitIndex 4 should return 2.', t => {
	t.is(bitIndex(4), 2);
});

test('bitIndex 3 should throw', t => {
	t.throws(() => {
		bitIndex(3);
	});
});
