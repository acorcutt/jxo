import test from 'ava';
import { JxO, objectify, jsonify, createReferencesHandler, createObjectHandler } from './src/index.js';

test('import', (t) => {
  t.is(objectify.constructor, Function);
  t.is(jsonify.constructor, Function);
});

test('jsonify simple types', (t) => {
  t.is(jsonify(null), null);
  t.is(jsonify(true), true);
  t.is(jsonify('text'), 'text');
  t.is(jsonify(1), 1);
});

test('jsonify array', (t) => {
  t.deepEqual(jsonify([]), []);
  t.deepEqual(jsonify([1, 2, 3]), [1, 2, 3]);
  t.deepEqual(jsonify([1, [2], [[3]]]), [1, [2], [[3]]]);
});

test('jsonify object', (t) => {
  t.deepEqual(jsonify({ a: 1 }), { $: 'Object', _: { a: 1 } });
});

test('jsonify special cases', (t) => {
  t.deepEqual(jsonify(undefined), { $: 'Undefined' });
  t.deepEqual(jsonify(Infinity), { $: 'Number', _: 'Infinity' });
  t.deepEqual(jsonify(NaN), { $: 'Number', _: 'NaN' });
});

test('jsonify extra types', (t) => {
  t.deepEqual(jsonify(BigInt('0xffffffffffffffff')), { $: 'BigInt', _: '18446744073709551615' });
  t.deepEqual(jsonify(new Date('1970-01-01T00:00:00.000Z')), { $: 'Date', _: '1970-01-01T00:00:00.000Z' });
  t.deepEqual(jsonify(new RegExp(/abc/, 'i')), {
    $: 'RegExp',
    _: {
      flags: 'i',
      source: 'abc',
    },
  });
});

test('objectify jsonified simple types', (t) => {
  t.is(objectify(jsonify(null)), null);
  t.is(objectify(jsonify(true)), true);
  t.is(objectify(jsonify('text')), 'text');
  t.is(objectify(jsonify(1)), 1);
  t.is(objectify(jsonify(Infinity)), Infinity);
  t.is(objectify(jsonify(NaN)), NaN);
  t.is(objectify(jsonify(undefined)), undefined);
  t.deepEqual(objectify(jsonify([])), []);
  t.deepEqual(objectify(jsonify({})), {});
  t.deepEqual(objectify(jsonify(new Date('1970-01-01T00:00:00.000Z'))), new Date('1970-01-01T00:00:00.000Z'));
  t.deepEqual(objectify(jsonify(new RegExp(/abc/, 'i'))), new RegExp(/abc/, 'i'));
});

test('default symbol & function handling', (t) => {
  // By default symbols and functions are ignored as they must maintain a reference to the original object
  t.is(objectify(jsonify(Symbol(0))), undefined);
  t.is(objectify(jsonify(() => {})), undefined);
});

test('referenced symbol & function handling', (t) => {
  // Symbols with identical names are NOT equal we must maintain reference
  const SA1 = Symbol('a');
  const SA2 = Symbol('a');
  t.not(SA1, SA2);
  const SB1 = Symbol('b');
  const SB2 = SB1;
  t.is(SB1, SB2);

  const FX = () => ({ fx: true }); // Function references can also be tracked
  class CX {} // Classes are really just Functions

  // By providing references to symbols and functions we can track and replace them with the original object
  const types = {
    // Symbols
    ...createReferencesHandler({
      SA1: SA1,
      SA2: SA2,
      SB1: SB1,
    }),
    // Functions & Classes
    ...createReferencesHandler(
      {
        FX: FX,
        CX: CX,
      },
      'Function',
      Function
    ),
  };

  t.is(objectify(jsonify(SA1, types), types), SA1);
  t.is(objectify(jsonify(FX, types), types), FX);

  t.deepEqual(objectify(jsonify([SA1, SA2, SB1], types), types), [SA1, SA2, SB1]);
  t.deepEqual(objectify(jsonify([FX, CX], types), types), [FX, CX]);

  t.is(objectify(jsonify(Symbol(0), types), types), undefined);
  t.is(objectify(jsonify(SA1)), undefined);
});

test('circular references', (t) => {
  const a = {
    b: 1,
    c: [2, 3],
  };
  a.self = a;
  a.c.push(a);
  a.c.push(a.c);

  // Circular references are maintained
  t.deepEqual(objectify(jsonify(a)), a);
});

test('multiple references', (t) => {
  const o = { z: 1 };
  const a = [o, o, o];

  // Multiple copies are stored by reference
  t.deepEqual(jsonify(a), [
    {
      $: 'Object',
      _: { z: 1 },
    },
    {
      $: 1,
    },
    {
      $: 1,
    },
  ]);
});

test('typed arrays', (t) => {
  const obj = {
    u: new Uint8Array([5, 4, 3, 2, 1]),
    b: new BigInt64Array([BigInt(1), BigInt(2)]),
  };
  t.deepEqual(objectify(jsonify(obj)), obj);
});

test('maps and sets', (t) => {
  const obj = {
    s: new Set([1, 1, 2, 3]),
    m: new Map([
      [1, 2],
      [{}, 4], // keys can be objects
      [null, Infinity],
    ]),
  };
  t.deepEqual(objectify(jsonify(obj)), obj);
});

test('class implementation', (t) => {
  // Use the class implementation as a replacement for JSON methods
  const types = {};
  const JXO = new JxO(types);

  const obj = {
    a: [null, Infinity, new Date(0)],
  };

  t.deepEqual(JXO.parse(JXO.stringify(obj)), obj);
});

test('custom types', (t) => {
  // You can create your own types and define how they are handled

  class Pet {
    constructor(kind) {
      this.kind = kind;
    }
  }

  // Extends works
  class SpecialPet extends Pet {
    constructor(kind) {
      super(kind);
      this.isSpecial = true;
    }
  }

  // We wont add the type for this and it will be ignored
  class LostPet extends Pet {
    constructor(kind) {
      super(kind);
      this.isLost = true;
    }
  }

  // Extend a base type
  class DateYear extends Date {
    constructor(year) {
      super(year, 0, 1);
    }
  }

  const obj = [new Pet('rabbit'), new SpecialPet('dog'), new DateYear(2000)];

  const types = {
    // For simple classes we can use the default object implementation that just gets/sets the props
    ...createObjectHandler('Pet', Pet),
    ...createObjectHandler('SpecialPet', SpecialPet),
    // For more control you can build your own handlers
    DateYear: [
      DateYear,
      // Get the full year as an integer
      (obj, key) => ({ $: key, _: obj.getFullYear() }),
      // Recreate the object and set the year
      (Type) => [
        (obj) => {
          const d = new Type();
          d.setFullYear(obj);
          return d;
        },
      ],
    ],
  };

  const JXO = new JxO(types);
  t.deepEqual(JXO.jsonify(new DateYear(2001)), { $: 'DateYear', _: 2001 });
  t.deepEqual(JXO.parse(JXO.stringify(obj)), obj);

  // Missing types dont transfer data
  t.deepEqual(JXO.jsonify(new LostPet('cat')), { $: 'LostPet' });
  t.is(JXO.parse(JXO.stringify(new LostPet('cat'))), undefined);
});

test('readme example', (t) => {
  const JXO = new JxO();

  const obj = {
    supports: new Set([NaN, Infinity, undefined, new Date(), new Map([['and', 'more']])]),
  };

  const str = JXO.stringify(obj);

  const res = JXO.parse(str);
  t.deepEqual(obj, res);
});
