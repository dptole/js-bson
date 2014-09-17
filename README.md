js-bson
=======

JavaScript implementation of the [BSON](http://bsonspec.org/) specification.

-

## Supported types

Data type | Description
--------- | ---------
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
  website: undefined,               // Undefined
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
```


