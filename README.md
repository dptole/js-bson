js-bson
=======

JavaScript implementation of the [BSON](http://bsonspec.org/) specification.

-

## Supported types

Data type | Description
--------- | ---------
Array | A BSON document number indexed.
Binary | A `Binary` instance with a `subtype` property.
Boolean | Standard boolean.
Document(Object) | A BSON document.
Double | 64-bit IEEE 754 floating point.
Int32 | Integer 32 bit signed value.
Int64 | Integer 64 bit signed value. <table><thead><th>When</th><th>Interpretation</th></thead><tbody><tr><td>Encoding</td><td>Double.</td><tr><td>Decoding</td><td>A `Int64` instance.</td></tbody></table><blockquote>Int64 is encoded and decoded differently because of the lack of support of the Int32+ numbers by the JavaScript language.</blockquote>
JS Code | JavaScript code.
JS Code with scope | JavaScript code with variables.
Null | Null JavaScript keyword.
RegExp | `RegExp` instance.
String | Int32 length UTF-8 string.
Undefined | Undefined JavaScript keyword. identify documents.
UTC Datetime | Unix epoch datetime in milliseconds.

## Not supported types

Data type | Description
--------- | ---------
DB Pointer | *Deprecated*.
Max Key | MongoDB [Max Key](http://docs.mongodb.org/manual/reference/operator/query/type/) internal type used to compare higher than all other possible BSON element values.
Min Key | MongoDB [Min Key](http://docs.mongodb.org/manual/reference/operator/query/type/) internal type used to compare lower than all other possible BSON element values.
Object Id | MongoDB [ObjectId](http://docs.mongodb.org/manual/reference/object-id/) internal type used to uniquely
Timestamp | MongoDB [Timestamp](http://docs.mongodb.org/manual/reference/method/ObjectId.getTimestamp/) internal type used for replication.

