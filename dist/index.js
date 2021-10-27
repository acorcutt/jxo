const $e9036bc7e4b4ba73$var$defaultObjectEncoder = (obj, key, next, withRef)=>withRef(()=>{
        return {
            $: key,
            _: Object.entries(obj).reduce((acc, [key, _obj])=>{
                return {
                    ...acc,
                    [key]: next(_obj)
                };
            }, {
            })
        };
    })
;
const $e9036bc7e4b4ba73$var$defaultObjectDecoder = (Type)=>{
    const obj = new Type(); // Use detected type for reuseabilty
    return [
        (json, next)=>{
            return Object.entries(json).reduce((_obj, [key, value])=>{
                _obj[key] = next(value);
                return _obj;
            }, obj);
        },
        obj, 
    ];
};
function $e9036bc7e4b4ba73$export$7fc33a7b2672fa1e(key = 'Object', Type = Object) {
    return {
        [key]: [
            Type,
            $e9036bc7e4b4ba73$var$defaultObjectEncoder,
            $e9036bc7e4b4ba73$var$defaultObjectDecoder
        ]
    };
}
function $e9036bc7e4b4ba73$export$ce49242f4678ffb8(key, Type) {
    return {
        [key]: [
            Type,
            (obj, key)=>({
                    $: key,
                    _: String(obj)
                })
            ,
            (Type)=>[
                    (json)=>Type(json)
                ]
        ]
    };
}
function $e9036bc7e4b4ba73$export$92682d8a0030b3b7(key, Type) {
    return {
        [key]: [
            Type,
            (obj, key)=>({
                    $: key,
                    _: Array.from(obj)
                })
            ,
            (Type)=>[
                    (json)=>new Type(json)
                ]
        ]
    };
}
function $e9036bc7e4b4ba73$export$701eba25a361ee0f(refs = {
}, key = 'Symbol', Type = Symbol) {
    // Swap refs key -> symbol to symbol -> key
    const symbols = Object.entries(refs).reduce((map, [_key, sym])=>{
        return map.set(sym, _key);
    }, new Map());
    return {
        [key]: [
            Type,
            (obj, key)=>({
                    $: key,
                    _: symbols.get(obj)
                })
            ,
            ()=>[
                    (json)=>refs[json]
                ]
        ]
    };
}
// Object -> JSON
const $e9036bc7e4b4ba73$var$defaultEncoder = (obj)=>obj
;
// JSON -> Object
const $e9036bc7e4b4ba73$var$defaultDecoder = ()=>[
        (json)=>json
    ]
;
const $e9036bc7e4b4ba73$var$defaultTypes = {
    // Handle decoding Undefined objects
    Undefined: [
        class Undefined {
        }
    ],
    // Simple types
    Boolean: [
        Boolean
    ],
    String: [
        String
    ],
    Number: [
        Number,
        (obj, key)=>Number.isFinite(obj) ? obj : {
                $: key,
                _: String(obj)
            }
        ,
        ()=>[
                (json)=>Number(json)
            ]
    ],
    // Extended types
    ...$e9036bc7e4b4ba73$export$ce49242f4678ffb8('BigInt', BigInt),
    BigInt64Array: [
        BigInt64Array,
        (obj, key, next)=>({
                $: key,
                _: Array.from(obj).map(next)
            })
        ,
        (Type)=>[
                (json, next)=>new Type(json.map(next))
            ]
    ],
    BigUint64Array: [
        BigUint64Array,
        (obj, key, next)=>({
                $: key,
                _: Array.from(obj).map(next)
            })
        ,
        (Type)=>[
                (json, next)=>new Type(json.map(next))
            ]
    ],
    Date: [
        Date,
        (obj, key)=>({
                $: key,
                _: obj.toISOString()
            })
        ,
        (Type)=>[
                (json)=>new Type(json)
            ]
    ],
    RegExp: [
        RegExp,
        (obj, key)=>({
                $: key,
                _: {
                    source: obj.source,
                    flags: obj.flags
                }
            })
        ,
        (Type)=>[
                (json)=>new Type(json.source, json.flags)
            ]
    ],
    // Typed Arrays
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Uint8Array', Uint8Array),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Uint8ClampedArray', Uint8ClampedArray),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Int8Array', Int8Array),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Uint16Array', Uint16Array),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Int16Array', Int16Array),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Uint32Array', Uint32Array),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Int32Array', Int32Array),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Float32Array', Float32Array),
    ...$e9036bc7e4b4ba73$export$92682d8a0030b3b7('Float64Array', Float64Array),
    // Objects that support circular references or references to other objects
    Array: [
        Array,
        (obj, _, next, withRef)=>withRef(()=>obj.map(next)
            )
        ,
        (Type)=>{
            // Create object first so we can reference it before recursion
            const array = new Type();
            return [
                (json, next)=>json.reduce((_arr, obj)=>{
                        _arr.push(next(obj));
                        return _arr;
                    }, array)
                ,
                array, 
            ];
        }, 
    ],
    Set: [
        Set,
        (obj, key, next, withRef)=>withRef(()=>({
                    $: key,
                    _: Array.from(obj).map(next)
                })
            )
        ,
        (Type)=>{
            const set = new Type();
            return [
                (json, next)=>json.reduce((_set, obj)=>{
                        _set.add(next(obj));
                        return _set;
                    }, set)
                ,
                set, 
            ];
        }, 
    ],
    Map: [
        Map,
        (obj, key, next, withRef)=>withRef(()=>({
                    $: key,
                    _: Array.from(obj).map(next)
                })
            )
        ,
        (Type)=>{
            const map = new Type();
            return [
                (json, next)=>json.reduce((_map, [key, obj])=>{
                        // NOTE - keys can be Objects so recurse
                        _map.set(next(key), next(obj));
                        return _map;
                    }, map)
                ,
                map, 
            ];
        }, 
    ],
    ...$e9036bc7e4b4ba73$export$7fc33a7b2672fa1e()
};
function $e9036bc7e4b4ba73$var$_objectToJson(obj, types, refs, fallback) {
    // These do not have constructors
    if (obj === null) return null;
    if (obj === undefined) return {
        $: 'Undefined'
    };
    const type = types.get(obj.constructor);
    if (type) {
        const [key, get = $e9036bc7e4b4ba73$var$defaultEncoder] = type;
        return get(obj, key, /* next */ (_obj)=>$e9036bc7e4b4ba73$var$_objectToJson(_obj, types, refs, fallback)
        , /* withRef*/ (fn)=>{
            // If we have a reference to this object, use it
            if (refs.includes(obj)) return {
                $: refs.indexOf(obj)
            };
            else {
                // Store Object ref
                refs.push(obj);
                // Return from type builder
                return fn();
            }
        });
    } else return fallback(obj);
}
function $e9036bc7e4b4ba73$var$_jsonToObject(json, types, typesMap, refs, fallback) {
    // Types without constructor
    if (json === null) return null;
    // undefined is not valid JSON maybe should throw error
    if (json === undefined) return undefined;
    // Self-References are Objects with integer $ keys
    if (json.constructor === Object && Number.isInteger(Number.parseInt(json.$))) return refs[Number.parseInt(json.$)];
    // Native types
    if (json.constructor === Object || json.constructor === Array || json.constructor === String || json.constructor === Number || json.constructor === Boolean) {
        const [_, __, decoder = $e9036bc7e4b4ba73$var$defaultDecoder] = (json.constructor === Object ? types[json.$] : typesMap.get(json.constructor)) || [];
        const [fn, ref] = decoder(json.constructor === Object ? (types[json.$] || $e9036bc7e4b4ba73$var$defaultDecoder)[0] : json.constructor);
        // Push ref before recursion
        if (ref) refs.push(ref);
        // Build recuresive function handler can call
        const next = (json)=>$e9036bc7e4b4ba73$var$_jsonToObject(json, types, typesMap, refs, fallback)
        ;
        // Call jsonToObject handler
        if (json.constructor === Object) return fn(json._, next);
        else return fn(json, next);
    }
    // TODO - Should we error instead on invalid json?
    return undefined;
}
function $e9036bc7e4b4ba73$export$828acff4ac78a63f(obj, types = {
}, fallback = (obj)=>({
        $: obj.constructor.name
    })
) {
    // TODO - can we validate types here if not too expensive?
    return $e9036bc7e4b4ba73$var$_objectToJson(obj, Object.entries({
        ...$e9036bc7e4b4ba73$var$defaultTypes,
        ...types
    }).reduce((map, [key, [type, get, set]])=>{
        return map.set(type, [
            key,
            get,
            set
        ]);
    }, new Map()), [], fallback);
}
function $e9036bc7e4b4ba73$export$92b78acdbe066b6b(json, types = {
}, fallback = (json)=>json
) {
    // TODO - can we validate types here if not too expensive?
    return $e9036bc7e4b4ba73$var$_jsonToObject(json, {
        ...$e9036bc7e4b4ba73$var$defaultTypes,
        ...types
    }, Object.entries({
        ...$e9036bc7e4b4ba73$var$defaultTypes,
        ...types
    }).reduce((map, [key, [type, get, set]])=>{
        return map.set(type, [
            key,
            get,
            set
        ]);
    }, new Map()), [], fallback);
}
function $e9036bc7e4b4ba73$export$fac44ee5b035f737(obj, types = {
}) {
    return JSON.stringify($e9036bc7e4b4ba73$export$828acff4ac78a63f(obj, types));
}
function $e9036bc7e4b4ba73$export$98e6a39c04603d36(str, types = {
}) {
    return $e9036bc7e4b4ba73$export$92b78acdbe066b6b(JSON.parse(str), types);
}
class $e9036bc7e4b4ba73$export$541ac9d92787cb0b {
    constructor(types = {
    }){
        this.types = types;
    }
    stringify(obj) {
        return $e9036bc7e4b4ba73$export$fac44ee5b035f737(obj, this.types);
    }
    parse(str) {
        return $e9036bc7e4b4ba73$export$98e6a39c04603d36(str, this.types);
    }
    jsonify(obj) {
        return $e9036bc7e4b4ba73$export$828acff4ac78a63f(obj, this.types);
    }
    objectify(json) {
        return $e9036bc7e4b4ba73$export$92b78acdbe066b6b(json, this.types);
    }
}


export {$e9036bc7e4b4ba73$export$7fc33a7b2672fa1e as createObjectHandler, $e9036bc7e4b4ba73$export$ce49242f4678ffb8 as createStringifiedHandler, $e9036bc7e4b4ba73$export$92682d8a0030b3b7 as createTypedArrayHandler, $e9036bc7e4b4ba73$export$701eba25a361ee0f as createReferencesHandler, $e9036bc7e4b4ba73$export$828acff4ac78a63f as jsonify, $e9036bc7e4b4ba73$export$92b78acdbe066b6b as objectify, $e9036bc7e4b4ba73$export$fac44ee5b035f737 as stringify, $e9036bc7e4b4ba73$export$98e6a39c04603d36 as parse, $e9036bc7e4b4ba73$export$541ac9d92787cb0b as JxO};
//# sourceMappingURL=index.js.map
