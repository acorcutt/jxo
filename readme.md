# JxO

Make almost any JavaScript Object JSON safe for use with JSON.stringify and JSON.parse. With support for circular references, Maps, Sets, Typed Arrays, Symbols and custom types.

## Installation

```
npm install jxo
pnpm add jxo
yarn add jxo
```

## Basic Usage

Use as a replacement for JSON.stringify and JSON.parse

```javascript
import { JxO } from 'jxo';

const JXO = new JxO();

const obj = {
  supports: new Set([NaN, Infinity, undefined, new Date(), new Map([['and', 'more']])]),
};
obj.self = obj;

const str = JXO.stringify(obj);

const res = JXO.parse(str);

```

## Examples

See [test.js](test.js) for more examples.

---

## TODO

- [ ] Better instructions
- [ ] More examples
- [ ] Better fallback handing with customisation
- [ ] Validate the custom types
- [ ] Encoders for typed arrays
- [ ] Buffers
