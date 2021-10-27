const defaultObjectEncoder = (obj, key, next, withRef) =>
  withRef(() => {
    return {
      $: key,
      _: Object.entries(obj).reduce((acc, [key, _obj]) => {
        return { ...acc, [key]: next(_obj) };
      }, {}),
    };
  });

const defaultObjectDecoder = (Type) => {
  const obj = new Type(); // Use detected type for reuseabilty
  return [
    (json, next) => {
      return Object.entries(json).reduce((_obj, [key, value]) => {
        _obj[key] = next(value);
        return _obj;
      }, obj);
    },
    obj,
  ];
};

/**
 * Build a handler for Objects or Classes that just sets and gets props
 * @param {String} key
 * @param {*} Type
 */
export function createObjectHandler(key = 'Object', Type = Object) {
  return {
    [key]: [Type, defaultObjectEncoder, defaultObjectDecoder],
  };
}

/**
 * Build a handler for Objects that can be stringified and parsed e.g. new BigInt('0') == new BigInt(String(new BigInt(0)))
 * @param {String} key
 * @param {*} Type
 */
export function createStringifiedHandler(key, Type) {
  return {
    [key]: [Type, (obj, key) => ({ $: key, _: String(obj) }), (Type) => [(json) => Type(json)]],
  };
}

export function createTypedArrayHandler(key, Type) {
  return {
    [key]: [Type, (obj, key) => ({ $: key, _: Array.from(obj) }), (Type) => [(json) => new Type(json)]],
  };
}
/**
 * This is used to map references to objects which are not serializable
 * e.g. Symbols and Functions
 *
 * @param {Object} refs - { KEY: Symbol } mapping
 * @param {String} key - Key to store in JSON
 * @param {*} Type - Type to match when calling obj.constructor of refs objects
 */
export function createReferencesHandler(refs = {}, key = 'Symbol', Type = Symbol) {
  // Swap refs key -> symbol to symbol -> key
  const symbols = Object.entries(refs).reduce((map, [_key, sym]) => {
    return map.set(sym, _key);
  }, new Map());
  return { [key]: [Type, (obj, key) => ({ $: key, _: symbols.get(obj) }), () => [(json) => refs[json]]] };
}

// Object -> JSON
const defaultEncoder = (obj) => obj;
// JSON -> Object
const defaultDecoder = () => [(json) => json];

const defaultTypes = {
  // Handle decoding Undefined objects
  Undefined: [class Undefined {}],

  // Simple types
  Boolean: [Boolean],
  String: [String], // TODO - optional encoding if set
  Number: [Number, (obj, key) => (Number.isFinite(obj) ? obj : { $: key, _: String(obj) }), () => [(json) => Number(json)]],

  // Extended types
  ...createStringifiedHandler('BigInt', BigInt),
  BigInt64Array: [BigInt64Array, (obj, key, next) => ({ $: key, _: Array.from(obj).map(next) }), (Type) => [(json, next) => new Type(json.map(next))]],
  BigUint64Array: [BigUint64Array, (obj, key, next) => ({ $: key, _: Array.from(obj).map(next) }), (Type) => [(json, next) => new Type(json.map(next))]],

  Date: [Date, (obj, key) => ({ $: key, _: obj.toISOString() }), (Type) => [(json) => new Type(json)]],
  RegExp: [RegExp, (obj, key) => ({ $: key, _: { source: obj.source, flags: obj.flags } }), (Type) => [(json) => new Type(json.source, json.flags)]],

  // Typed Arrays
  ...createTypedArrayHandler('Uint8Array', Uint8Array),
  ...createTypedArrayHandler('Uint8ClampedArray', Uint8ClampedArray),
  ...createTypedArrayHandler('Int8Array', Int8Array),
  ...createTypedArrayHandler('Uint16Array', Uint16Array),
  ...createTypedArrayHandler('Int16Array', Int16Array),
  ...createTypedArrayHandler('Uint32Array', Uint32Array),
  ...createTypedArrayHandler('Int32Array', Int32Array),
  ...createTypedArrayHandler('Float32Array', Float32Array),
  ...createTypedArrayHandler('Float64Array', Float64Array),

  // Objects that support circular references or references to other objects
  Array: [
    Array,
    (obj, _, next, withRef) => withRef(() => obj.map(next)),
    (Type) => {
      // Create object first so we can reference it before recursion
      const array = new Type();
      return [
        (json, next) =>
          json.reduce((_arr, obj) => {
            _arr.push(next(obj));
            return _arr;
          }, array),
        array,
      ];
    },
  ],
  Set: [
    Set,
    (obj, key, next, withRef) => withRef(() => ({ $: key, _: Array.from(obj).map(next) })),
    (Type) => {
      const set = new Type();
      return [
        (json, next) =>
          json.reduce((_set, obj) => {
            _set.add(next(obj));
            return _set;
          }, set),
        set,
      ];
    },
  ],
  Map: [
    Map,
    (obj, key, next, withRef) => withRef(() => ({ $: key, _: Array.from(obj).map(next) })),
    (Type) => {
      const map = new Type();
      return [
        (json, next) =>
          json.reduce((_map, [key, obj]) => {
            // NOTE - keys can be Objects so recurse
            _map.set(next(key), next(obj));
            return _map;
          }, map),
        map,
      ];
    },
  ],
  ...createObjectHandler(),
};

function _objectToJson(obj, types, refs, fallback) {
  // These do not have constructors
  if (obj === null) {
    return null;
  }
  if (obj === undefined) {
    return { $: 'Undefined' };
  }

  const type = types.get(obj.constructor);

  if (type) {
    const [key, get = defaultEncoder] = type;
    return get(
      obj,
      key,
      /* next */ (_obj) => _objectToJson(_obj, types, refs, fallback),
      /* withRef*/ (fn) => {
        // If we have a reference to this object, use it
        if (refs.includes(obj)) {
          return { $: refs.indexOf(obj) };
        } else {
          // Store Object ref
          refs.push(obj);
          // Return from type builder
          return fn();
        }
      }
    );
  } else {
    return fallback(obj);
  }
}

function _jsonToObject(json, types, typesMap, refs, fallback) {
  // Types without constructor
  if (json === null) {
    return null;
  }
  // undefined is not valid JSON maybe should throw error
  if (json === undefined) {
    return undefined;
  }

  // Self-References are Objects with integer $ keys
  if (json.constructor === Object && Number.isInteger(Number.parseInt(json.$))) {
    return refs[Number.parseInt(json.$)];
  }

  // Native types
  if (json.constructor === Object || json.constructor === Array || json.constructor === String || json.constructor === Number || json.constructor === Boolean) {
    const [_, __, decoder = defaultDecoder] = (json.constructor === Object ? types[json.$] : typesMap.get(json.constructor)) || [];
    const [fn, ref] = decoder(json.constructor === Object ? (types[json.$] || defaultDecoder)[0] : json.constructor);
    // Push ref before recursion
    if (ref) {
      refs.push(ref);
    }
    // Build recuresive function handler can call
    const next = (json) => _jsonToObject(json, types, typesMap, refs, fallback);
    // Call jsonToObject handler
    if (json.constructor === Object) {
      return fn(json._, next);
    } else {
      return fn(json, next);
    }
  }

  // TODO - Should we error instead on invalid json?
  return undefined;
}

export function jsonify(
  obj,
  types = {},
  fallback = (obj) => ({
    $: obj.constructor.name,
  })
) {
  // TODO - can we validate types here if not too expensive?
  return _objectToJson(
    obj,
    Object.entries({ ...defaultTypes, ...types }).reduce((map, [key, [type, get, set]]) => {
      return map.set(type, [key, get, set]);
    }, new Map()),
    [],
    fallback
  );
}

export function objectify(json, types = {}, fallback = (json) => json) {
  // TODO - can we validate types here if not too expensive?
  return _jsonToObject(
    json,
    { ...defaultTypes, ...types },
    Object.entries({ ...defaultTypes, ...types }).reduce((map, [key, [type, get, set]]) => {
      return map.set(type, [key, get, set]);
    }, new Map()),
    [],
    fallback
  );
}

export function stringify(obj, types = {}) {
  return JSON.stringify(jsonify(obj, types));
}

export function parse(str, types = {}) {
  return objectify(JSON.parse(str), types);
}

export class JxO {
  constructor(types = {}) {
    this.types = types;
  }
  stringify(obj) {
    return stringify(obj, this.types);
  }
  parse(str) {
    return parse(str, this.types);
  }

  jsonify(obj) {
    return jsonify(obj, this.types);
  }

  objectify(json) {
    return objectify(json, this.types);
  }
}
