js-bson
=======

JavaScript implementation of the [BSON](http://bsonspec.org/) specification.

-

Support
=======

Data type | Supported | Description
--------- | --------- | -----------
Double | Yes | 64-bit IEEE 754 floating point.
String | Yes | Int32 length UTF-8 string, excluding the 0x00 character.
Document(Object) | Yes | A BSON document.
Array | Yes | A BSON document number indexed.
Binary | Yes | A `Binary` instance with a `subtype` property.
Undefined | Yes | Undefined JavaScript keyword.
Object Id | No | MongoDB [ObjectId](http://docs.mongodb.org/manual/reference/object-id/) internal type used to uniquely identify documents.
Boolean | Yes | Standard boolean.
UTC Datetime | Yes | Unix epoch datetime in milliseconds.
Null | Yes | Null JavaScript keyword.
RegExp | Yes | `RegExp` instance.
DB Pointer | No | *Deprecated*.
JS Code | Yes | JavaScript code.
Deprecated | No | *Deprecated*.
JS Code with scope | Yes | JavaScript code with variables.
Int32 | Yes | Integer 32 bit signed value.
Timestamp | No | MongoDB [Timestamp](http://docs.mongodb.org/manual/reference/method/ObjectId.getTimestamp/) internal type used for replication.
Int64 | Yes | Integer 64 bit signed value. <table><thead><th>When</th><th>Interpretation</th></thead><tbody><tr><td>Encoding</td><td>Double.</td><tr><td>Decoding</td><td>A `Int64` instance.</td></tbody></table>
Min Key | No | MongoDB [Min Key](http://docs.mongodb.org/manual/reference/operator/query/type/) internal type used to compare lower than all other possible BSON element values.
Max Key | No | MongoDB [Max Key](http://docs.mongodb.org/manual/reference/operator/query/type/) internal type used to compare higher than all other possible BSON element values.

