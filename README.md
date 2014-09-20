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

## Undefined and Int64

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

## Encoding Binary data

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

## Encoding JS Code/JS Code with scope

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


