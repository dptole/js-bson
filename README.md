js-bson
=======

JavaScript implementation of the [BSON](http://bsonspec.org/) specification.

-

## Supported types

Data type | Description
--------- | -----------
Array | A BSON embedded document number indexed.
Binary | A `Binary` instance with a `subtype` property.
Boolean | Standard boolean.
Document | A BSON embedded document.
Double | 64-bit IEEE 754 floating point.
Int32 | Integer 32 bit signed value.
Int64 | Integer 64 bit signed value. <table><thead><th>When</th><th>Interpretation</th></thead><tbody><tr><td>Encoding</td><td>Double.</td><tr><td>Decoding</td><td>A `Int64` instance.</td></tbody></table><blockquote>Int64 is encoded and decoded differently because of the lack of support of the Int32+ numbers by the JavaScript language.</blockquote>
JS Code | JavaScript code.
JS Code with scope | JavaScript code with variables.
Null | Null JavaScript keyword.
RegExp | Regular expression.
String | Int32 length UTF-8 string.
Undefined | Undefined JavaScript keyword. <blockquote>Accordingly to the BSON specification this type should be deprecated but, as long as JavaScript have a keyword specifically created to express this type of data, I will keep it.</blockquote>
UTC Datetime | Unix epoch datetime in milliseconds.

## Not supported types

Data type | Description
--------- | ---------
DB Pointer | *Deprecated*.
Max Key | MongoDB [Max Key](http://docs.mongodb.org/manual/reference/operator/query/type/) internal type used to compare higher than all other possible BSON element values.
Min Key | MongoDB [Min Key](http://docs.mongodb.org/manual/reference/operator/query/type/) internal type used to compare lower than all other possible BSON element values.
Object Id | MongoDB [ObjectId](http://docs.mongodb.org/manual/reference/object-id/) internal type used to uniquely
Timestamp | MongoDB [Timestamp](http://docs.mongodb.org/manual/reference/method/ObjectId.getTimestamp/) internal type used for replication.

## Basic

To create a BSON document using JavaScript types:

```javascript
var encoded_bson = BSON.encode({
  login: 'dptole',                  // String
  id: 3951114,                      // Int32
  gender: null,                     // Null
  ready_profile: 12.34,             // Double
  formats: /(jpe?g|mp[34]|html?)/,  // RegExp
  site_admin: false,                // Boolean(false)
  is_user: true,                    // Boolean(true)
  limbs: {                          // BSON embedded document
    arms: ['hands', 'fingers'],     // BSON embedded document number indexed
  },
  created_at: new Date(2013, 2, 23) // UTC Datetime
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.login         : 'dptole'
  javascript_object.id            : 3951114
  javascript_object.gender        : null
  javascript_object.ready_profile : 12.34
  javascript_object.formats       : /(jpe?g|mp[34]|html?)/
  javascript_object.site_admin    : false
  javascript_object.is_user       : true
  javascript_object.limbs         : {arms: ['hands', 'fingers']}
  javascript_object.limbs.arms    : ['hands', 'fingers']
  javascript_object.limbs.arms[0] : 'hands'
  javascript_object.limbs.arms[1] : 'fingers'
  javascript_object.created_at    : 'Sat, 23 Mar 2013 00:00:00 GMT'
*/

```

### Undefined and Int64

Accordingly to the BSON specification the `undefined` type should be deprecated but, as long as JavaScript have a keyword specifically created to express this type of data, I will keep it.
`Int64` is encoded as `Double` because of the lack of support of the Int32+ numbers by the JavaScript language.

```javascript
var encoded_bson = BSON.encode({
  website: undefined,               // Undefined
  timestamp: +new Date              // Int64 encoded as Double
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.website   : undefined
  javascript_object.timestamp : 1411179144221
*/

```

### Encoding Binary data

Binary data can be encoded by calling `BSON.binary(data, substype)` where `data` may be any string and `substype` may be between 0x00-0x05 or 0x80-0xFF. Some castings may occur during `subtype` interpretation.

Subtype | Casting
------- | -------
Binary (0x02) | Generic (0x00)
UUID Old (0x03) | UUID (0x04)

```javascript
var encoded_bson = BSON.encode({
  binary: BSON.binary('\x64\x70\x74\x6f\x6c\x65', 2)
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.binary
    Binary {toString: function, subtype: 0}
*/

```

### Encoding JS Code/JS Code with scope

JS Code data can be encoded by calling `BSON.jsCode(code)` where `code` may be any string. The syntax is verified when decoding.

```javascript
var encoded_bson = BSON.encode({
  fun: BSON.jsCode('return +new Date')
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.fun
    function anonymous() {
    return +new Date
    }
*/

```

JS Code with scope data can be encoded by calling `BSON.jsCodeWithScope(code, scope)` where `code` may be any string and `scope` is an object. Each key in `scope` will be a variable name within the JavaScript code and the key value is interpreted as JavaScript code.
Thus in `{"func": "Math.random"}` we have a variable called `func` which refers to the `Math.random` function, while in `{"func": "'Math.random'"}` we have a variable called `func` which value is the string `"Math.random"`.
This behaviour may be desirable when one peer must call internal functions at the other peer's environment but don't want to duplicate the code nor worry about code update.

```javascript
var encoded_bson = BSON.encode({
  fun: BSON.jsCodeWithScope('return internal(origin, ts)', {
    origin: '"My nick"',
    internal: 'otherPeerFunction',
    ts: +new Date
  })
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.fun
    function anonymous() {
    var origin = "My nick"
      , internal = otherPeerFunction
      , ts = 1411177888866
    ;
    return internal(origin, ts)
    }
*/

```

### Encoding JS Code(functions) with arguments

JS Code(functions) with arguments can be encoded by calling `BSON.jsFunction(lambda)` where `lambda` may be any user defined function.

```javascript
var encoded_bson = BSON.encode({
  fun: BSON.jsFunction(function(a, b) {
    return a + b;
  })
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.fun
    function anonymous(a, b) {
      return a + b;
    }
*/

```

### Encoding JS Code(functions) with arguments and scope

JS Code(functions) with arguments and scope can be encoded by calling `BSON.jsFunction(lambda, variables)` where `lambda` may be any user defined function and `variables` works as `scope` in `BSON.jsCodeWithScope`.

```javascript
var encoded_bson = BSON.encode({
  fun: BSON.jsFunction(function(a, b) {
    return a * Math.pow(x, 2) + b * x + c;
  }, {x: 4, c: -16})
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.fun
    function anonymous(a, b) {
      var x = 4
        , c = -16
      ;
      return a * Math.pow(x, 2) + b * x + c;
    }
*/

```

> Attention! **JS Code** and **JS Code with scope** may not work across other implementations because not all of them may support it. Consider using these types just within the same implementation.

# Advanced

## Encoding

You can encode any element using a function as long as you understand the BSON specification, check the example:

```javascript
var encoded_bson = BSON.encode({
  true_key_custom: function( key ) {
    // \x08 - Boolean type
    // key  - 'true_key_custom'
    // \x00 - Separator
    // \x01 - true
    return '\x08' + key + '\x00\x01';
  },
  true_key: true
});

var javascript_object = BSON.decode(encoded_bson);
/*
  javascript_object.true_key_custom true
  javascript_object.true_key        true
*/

```

This way you can encode any BSON type, even those without support.

## Decoding

When decoding a chunk of BSON data the interpreter may find unexpected types that it don't know how to handle and it breaks. To deal with such situations, and to expand the possibilities of this BSON implementation, you may send a second argument as a function to `BSON.decode()` to treat unknown types. This function receives three arguments `type`, `key` and `buffer` and must return an array with 3 indexes [`Number`, `String`, `Anything`]. The following code may give you a better explanation:

```javascript
BSON.decode(bson_data, function(type, key, buffer) {
  // 
  // type -> Number
  //   The unknown type that you need to handle
  //   It's just 1 octet length and it's a number representing the unknown BSON type
  // 
  // key -> String
  //   Everything after <type> and before the null character <0x00>
  //   The captured value is interpreted as a string
  // 
  // buffer -> Array
  //   Everything after the null character <0x00> to the end of the document
  //   Notice that the last octet of a document is always <0x00>
  //   
  // This function must return an array with 3 indexes where
  // 
  // [
  //   Number,
  //     How many octets to the next type?
  //   String,
  //     What is the name of the key to the given document (may be an array)?
  //   Anything
  //     Any output value
  // ]
  // 
});
```

I will give you an example of how this fallback works. When you encode something like this

```javascript
var my_gps = BSON.encode({
  coords: [
    // \x80 - Coordinates user-defined type
    // key  - 0 (zero) to 4 (four)
    // \x00 - Separator
    // .... - X, Y and Z coordinates
    function(key) { return "\x80" + key + "\x00\x00\x55\xAA"; },
    function(key) { return "\x80" + key + "\x00\x11\x66\xBB"; },
    function(key) { return "\x80" + key + "\x00\x22\x77\xCC"; },
    function(key) { return "\x80" + key + "\x00\x33\x88\xDD"; },
    function(key) { return "\x80" + key + "\x00\x44\x99\xEE"; }
  ]
});
var json_object = BSON.decode(my_gps, function(type, key, buffer) {
  var coords = String.fromCharCode.apply(String, buffer);
  return [
    3,
    key,
    {
      x: coords.charCodeAt(0),
      y: coords.charCodeAt(1),
      z: coords.charCodeAt(2)
    }
  ];
});
/*
  json_object.coords    [Object, Object, Object, Object, Object]
  json_object.coords[0] {"x":  0, "y":  85, "z": 170}
  json_object.coords[1] {"x": 17, "y": 102, "z": 187}
  json_object.coords[2] {"x": 34, "y": 119, "z": 204}
  json_object.coords[3] {"x": 51, "y": 136, "z": 221} 
  json_object.coords[4] {"x": 68, "y": 153, "z": 238}
*/
```

The `my_gps` variable holds this BSON document `\x30\x00\x00\x00\x04\x63\x6f\x6f\x72\x64\x73\x00\x23\x00\x00\x00\x80\x30\x00\x00\x55\xaa\x80\x31\x00\x11\x66\xbb\x80\x32\x00\x22\x77\xcc\x80\x33\x00\x33\x88\xdd\x80\x34\x00\x44\x99\xee\x00\x00` and the following explanation may enlighten how this document is decoded and how the fallback function deal with it.

```javascript
// A document whose length is 48(0x30,0x00,0x00,0x00) and is written in little endian
\x30\x00\x00\x00

  // An array(0x04) whose name is "coords"(0x63,0x6F,0x6F,0x72,0x64,0x73)
  // and the separator 0x00
  \x04\x63\x6f\x6f\x72\x64\x73\x00
  
  // The length of this array is 35(0x23,0x00,0x00,0x00) written in little endian
  \x23\x00\x00\x00
  
    // The type of this element is 0x80(unknown) the name is "0"(0x30) and 0x00
    // is the separator. The BSON specification don't have a definition for a 0x80
    // type so it must be an user-defined type and the fallback function will be called
    \x80\x30\x00
    \x00\x55\xaa
    
    // function(type, key, buffer) {
    //   type   === 128 (0x80 interpreted as a number)
    //   key    === "0" (0x30 interpreted as a string)
    //   buffer === [0x00, 0x55, 0xaa, 0x80, 0x31, 0x00, 0x11, 0x66, 0xbb, 0x80,
    //               0x32, 0x00, 0x22, 0x77, 0xcc, 0x80, 0x33, 0x00, 0x33, 0x88,
    //               0xdd, 0x80, 0x34, 0x00, 0x44, 0x99, 0xee, 0x00, 0x00       ]
    // 
    //   ... Code to parse the data ...
    // 
    //   return [
    //     3,
    //       How many octets do I have to "walk" to get to the type of the next element?
    //         1  |   2   |   3   | Type of the next element
    //       \x00 | \x55  | \xaa  |        \x80
    //       This value may not be negative but it may be zero
    //     
    //     key,
    //       To the given document (array or object) which will be the name of this
    //       element? In this case it's an array so I'll keep the same index here but
    //       if I wanted I could set it to <"key" + key> and to access it I would have
    //       to write <javascript_object.coords.key0> for example
    //     
    //     value
    //       Any value
    //     
    //   ];
    // }
    
    // Same thing as before
    \x80\x31\x00
    \x11\x66\xbb
    
    // Same thing as before
    \x80\x32\x00
    \x22\x77\xcc
    
    // Same thing as before
    \x80\x33\x00
    \x33\x88\xdd
    
    // Same thing as before
    \x80\x34\x00
    \x44\x99\xee
  \x00
\x00
```

This way you can decode any BSON type, even those without support.
