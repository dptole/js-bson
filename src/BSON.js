-function( global ) {
  var
  TYPES = {
      DOUBLE       : { D: 0x01, E: '\x01' }
    , STRING       : { D: 0x02, E: '\x02' }
    , DOCUMENT     : { D: 0x03, E: '\x03' }
    , ARRAY        : { D: 0x04, E: '\x04' }
    , BINARY       : {
                       D: 0x05, E: '\x05',
          GENERIC  : { D: 0x00, E: '\x00' }
        , FUNCTION : { D: 0x01, E: '\x01' }
        , BINARY   : { D: 0x02, E: '\x02' } // Old, currently same as 0x00.
        , UUID_OLD : { D: 0x03, E: '\x03' } // Old, currently same as 0x04.
        , UUID     : { D: 0x04, E: '\x04' }
        , MD5      : { D: 0x05, E: '\x05' }
      }
    , UNDEFINED    : { D: 0x06, E: '\x06' } // Deprecated but implemented.
    , OBJECT_ID    : { D: 0x07, E: '\x07' } // Not implemented.
    , BOOLEAN      : { D: 0x08, E: '\x08' }
    , UTC_DATETIME : { D: 0x09, E: '\x09' }
    , NULL         : { D: 0x0A, E: '\x0A' }
    , REGEXP       : { D: 0x0B, E: '\x0B' }
    , DB_POINTER   : { D: 0x0C, E: '\x0C' } // Deprecated.
    , JS_CODE      : { D: 0x0D, E: '\x0D' }
    , DEPRECATED   : { D: 0x0E, E: '\x0E' } // Not implemented.
    , JS_CODE_W_S  : { D: 0x0F, E: '\x0F' }
    , INT32        : { D: 0x10, E: '\x10' }
    , TIMESTAMP    : { D: 0x11, E: '\x11' } // Not implemented.
    , INT64        : { D: 0x12, E: '\x12' }
    , MIN_KEY      : { D: 0xFF, E: '\xFF' } // Not implemented.
    , MAX_KEY      : { D: 0x7F, E: '\x7F' } // Not implemented.
  },

  ENCODE_FUNCTIONS = {
      'boolean'    : toBoolean
    , 'function'   : toFunction
    , number       : toNumber
    , object       : toObject
    , undefined    : toUndefined
    , string       : toString
  };

  /* ********************************************************************** */

  /* 
  Array.prototype.toUnicode() -> String

  Convert the array to the equivalent unicode characters code.
  Invalid codes become the U+0000 character.

  Ex.:
    [100, 112, 116, 111, 108, 101].toUnicode(); // 'dptole'

  */
  Object.defineProperty(Array.prototype, 'toUnicode', {
    value: function() {
      return String.fromCharCode.apply(String, this);
    },
    enumerable: false,
    configurable: false
  });

  /* ********************************************************************** */

  /* 
  Function.prototype.isNative() -> Boolean

  Checks if a function is native.
  Of course it is not accurate once languages don't usually differentiate
  between native/custom functions. But since people don't always edit the
  toString function of its functions it may be an option.
  I've created this validation to detect the error as soon as possible.

  Ex.:
    eval.isNative(); // true
    (function _21th() { return new Date(2001,0,1); }).isNative(); // false

  */
  Object.defineProperty(Function.prototype, 'isNative', {
    value: function() {
      return /function[^(]*\([^)]*\)[^{]*\{[^[]*\[native code\][^}]*\}/
        .test( '' + this );
    },
    enumerable: false,
    configurable: false
  });

  /* ********************************************************************** */

  /* 
  createFunction( code[, variables ] ) -> Function

  code -> String
  variables -> Object

  Creates a function given the code and the variables.
  The keys in the variables object are interpreted as follows:

    If some key has the following pattern 'arguments[N]', where N may
    represent any number, this variable will be added as a argument of the
    function in the Nth position, otherwise it will be a regular variable.

  If the code string isn't a valid JavaScript code it throws a SyntaxError.

  Ex.:
    var
    fun1 = createFunction(
      'return condition() ? if_true : otherwise', {
      'arguments[0]': 'condition',
      'arguments[1]': 'if_true',
      'arguments[2]': 'otherwise'
    }),
    fun2 = createFunction(
      'return (initial + (offset | 0)) % 100', {
      'initial': (new Date).getSeconds(),
      'arguments[0]': 'offset'
    });
    fun1(function(){return +new Date & 1;}, 'odd', 'even');
    fun2(Math.random() * 100);

  */
  function createFunction(code, variables) {
    var var_list = []
      , args = []
    ;

    if( typeof(variables) === 'object' && null !== variables ) {
      for( var name in variables ) {
        if( /arguments\[(\d+)\]/.exec(name) )
          args[RegExp.$1] = variables[name];
        else
          var_list.push( name + ' = ' + variables[name] );
      }
    }

    var_list = var_list.length
      ? 'var ' + var_list.join('\n  , ') + '\n;\n'
      : ''
    ;

    args.push( var_list + code );
    return Function.apply( Function, args );
  };

  /* ********************************************************************** */

  /*
  encode( document ) -> String

  document -> Object

  Converts the JavaScript Object into a BSON document.
  This function works as a helper to the BSON.encode.

  Ex.:
    var document = encode({
      eggs: true,
      bacon: "spam spam spam spam spam",
      knights: [{
        name: "Knight 1", atk: 10, def: 5
      }, {
        name: "Knight 2", atk: 5, def: 10
      }]
    }); // BSON stuff
    var object = decode( document ); // JavaScript object

  */
  function encode(document) {
    return encode.core(document, Object.getOwnPropertyNames(document), '', 0);
  };
  encode.core = function(document, properties, bson, i) {
    for(; i < properties.length; i++)
      bson += ENCODE_FUNCTIONS[ typeof( document[ properties[ i ] ] ) ](
        properties[i],
        document[ properties[ i ] ]
      );

    return readAsInt32LE( bson.length + 5 ) + bson + '\x00';
  };

  /* ********************************************************************** */

  /*
  decode( bson, is_array ) -> Object

  bson -> String
  is_array -> Boolean

  Converts the BSON document into a JavaScript Object.
  This function works as a helper to the BSON.decode.

  Ex.:
    var object = decode(
      '\x27\x00\x00\x00' +
        '\x10\x6e\x75\x6d\x62\x65\x72\x00' +
          '\x39\x30\x00\x00' +
        '\x02\x73\x74\x72\x69\x6e\x67\x00' +
          '\x00\x00\x00\x68' +
          '\x65\x79\x20\x62\x75\x64\x64\x79\x00' +
      '\x00'
    ); // {"number": 12345, "string": "key buddy"}

  */
  function decode(buffer, is_array) {
    var offset = 0
      , key = null
      , type = null
      , decoded = is_array ? [] : {}
      , length = buffer.readInt32LE(offset)
    ;

    if( length !== buffer.length )
      throw new Error(
        'BSON header error, got '
        + buffer.length + ' but expected ' + length + '.'
      );
    offset += 4;

    while( offset < length ) {
      type = buffer.pick( offset++ );

      key = is_array
        ? is_array++ - 1
        : buffer.sliceWhile(
            function(octect) { return octect !== 0; }, offset
          ).toArray().toUnicode()
      ;
      offset += key.toString().length + 1;
      switch(type) {
        case 0: break;

        case TYPES.JS_CODE_W_S.D:
          var data_type_length = buffer.readInt32LE(offset)
            
            , code_length_offset = offset + 4
            , code_length = buffer.readInt32LE(code_length_offset)
            
            , code_offset = code_length_offset + 4
            , code = buffer.toArray(code_offset, code_length - 1).toUnicode()

            , variables_length_offset = code_offset + code.length + 1
            , variables_length = buffer.readInt32LE(variables_length_offset)
            , variables_encoded = buffer.toArray(
                  variables_length_offset,
                  variables_length
                ).toUnicode()
            , variables = BSON.decode(variables_encoded)
          ;

          decoded[key] = createFunction(code, variables);
          offset += data_type_length;
        break;

        case TYPES.JS_CODE.D:
          var code_length = buffer.readInt32LE(offset)
            , code = buffer.toArray( offset + 4, code_length - 1 ).toUnicode()
          ;
          decoded[key] = Function(code);
          offset += code_length + 4;
        break;

        case TYPES.BINARY.D:
        case TYPES.STRING.D:
          var start = offset + 4 + ( TYPES.BINARY.D === type )
            , end =
                buffer.readInt32LE(offset)
                - ( TYPES.STRING.D === type )
          ;
          decoded[key] = buffer.toArray(start, end).toUnicode();

          if( TYPES.BINARY.D === type )
            decoded[key] = Binary(
              decoded[key],
              buffer.pick( offset + 4 )
            );

          offset += decoded[key].length + 4;
        break;

        case TYPES.DOCUMENT.D:
        case TYPES.ARRAY.D:
          var end_offset = buffer.readInt32LE(offset);
          decoded[key] = decode(
            buffer.slice( offset, end_offset ), TYPES.ARRAY.D === type
          );
          offset += end_offset - 1;
        break;

        case TYPES.BOOLEAN.D:
          decoded[key] = !!buffer.pick(offset);
        break;

        case TYPES.UNDEFINED.D:
        case TYPES.NULL.D:
          decoded[key] = TYPES.NULL.D === type ? null : undefined;
          offset--;
        break;

        case TYPES.INT32.D:
          decoded[key] = buffer.readInt32LE(offset, 4);
          offset += 3;
        break;

        case TYPES.UTC_DATETIME.D:
        case TYPES.DOUBLE.D:
        case TYPES.INT64.D:
          decoded[key] = TYPES.UTC_DATETIME.D === type
            ? new Date( buffer.readInt64LE( offset ) )
            : ( TYPES.DOUBLE.D === type
                ? buffer.readFloat64LE(offset)
                : new Int64( buffer.toArray( offset, 8 ) )
              )
          ;
          offset += 7;
        break;

        case TYPES.REGEXP.D:
          var source = buffer.sliceWhile(
                function(octect) { return octect !== 0; }, offset
              ).toArray()
            , modifiers = buffer.sliceWhile(
                function(octect) { return octect !== 0; },
                offset + source.length + 1
              ).toArray()
          ;
          decoded[key] = new RegExp(source.toUnicode(), modifiers.toUnicode());
          offset += source.length + modifiers.length + 1;
        break;

        default: throw new Error('Unknown type ' + type );
      }

      offset++;
    }

    return decoded;
  };

  /* ********************************************************************** */

  /*
  littleEndian( bytes, data ) -> String

  bytes -> Number
  data -> Number

  Gets a little endian binary representation of the value stored in `data`
  containing `bytes` number of octects.

                              +---------+
  +---------------------------| Warning |---------------------------+
  |                           +---------+                           |
  |                                                                 |
  | Numbers greater than 9007199254740991(2^53-1) or lesser than    |
  | -9007199254740991(-(2^53)+1) are not precisely calculated.      |
  |                                                                 |
  +-----------------------------------------------------------------+

  Ex.:
    var i32 = littleEndian(4, 123456);     // '\x40\xE2\x01\x00'
    var i64 = littleEndian(8, 4567890123); // '\xcb\x78\x44\x10\x01\x00\x00\x00'

  More info:
    <http://migre.me/lukzt>

  */
  function littleEndian(bytes, data) {
    if( data < 0 )
           if( bytes <= 4 ) data = 0x100000000         + data;
      else if( bytes <= 8 ) data = 0x10000000000000000 + data;

    for(
      var i = 0, buffer = [];
      i++ < bytes;
      buffer.push( data & 0xFF ), data /= 256
    );

    return String.fromCharCode.apply( String, buffer );
  };
  function readAsInt32LE(data) { return littleEndian(4, data); };
  function readAsInt64LE(data) { return littleEndian(8, data); };
  
  /* ********************************************************************** */

  /*
  readAsDouble64LE( number ) -> String

  number -> Number

  Read the given number and return a IEEE754 double precision version of it
  as string.

  Ex.:
    var ieee = readAsDouble64LE(123.456); // "\x77\xbe\x9f\x1a\x2f\xdd\x5e\x40"

  */
  function readAsDouble64LE(number) {
    var double64 = []
      , bias = 1023
      , max_bias = 2047
      , sign = number < 0 ? 1 : 0
      , data = Math.abs( number )
      , exponent = Math.floor( Math.log( data ) / Math.LN2 )
      , exponent_length = 11
      , mantissa = 0
      , mantissa_length = 52
      , flag = Math.pow( 2, -exponent )
    ;

    if( data * flag <  1 ) exponent--, flag *= 2;
    if( data * flag >= 2 ) exponent++, flag /= 2;

    if( exponent + bias >= max_bias ) {
      exponent = max_bias;
    } else if ( exponent + bias >= 1 ) {
      mantissa = ( data * flag - 1 ) * Math.pow( 2, mantissa_length );
      exponent = exponent + bias;
    } else {
      mantissa =
        data * Math.pow( 2, bias - 1 ) * Math.pow( 2, mantissa_length );
      exponent = 0;
    }

    for (;
      mantissa_length >= 8;
      double64.push( mantissa & 0xFF ), mantissa /= 256, mantissa_length -= 8
    );

    exponent = ( exponent << mantissa_length ) | mantissa;
    exponent_length += mantissa_length;
    for (;
      exponent_length > 0;
      double64.push( exponent & 0xFF ), exponent /= 256, exponent_length -= 8
    );

    double64[7] |= sign * 128;
    return double64.toUnicode();
  };

  /* ********************************************************************** */

  /*
  toBoolean( key, value ) -> String

  key -> String
  value -> Boolean

  Converts a JavaScript boolean into a BSON boolean.

  Ex.:
    var t = toBoolean('key', true);  // \x08\x6b\x65\x79\x00\x01
    var f = toBoolean('key', false); // \x08\x6b\x65\x79\x00\x00

  */
  function toBoolean(key, value) {
    return TYPES.BOOLEAN.E + key + '\x00' + ( value ? '\x01' : '\x00' );
  };

  /* ********************************************************************** */

  /*
  toFunction( key, lambda ) -> String

  key -> String
  lambda ->
    Function( key ) -> String
    key -> String

  This function is used internally to parse data types not present  in
  JavaScript or those that need a pre-parsing.

  Ex.:
    var k1 = toFunction('def', function(key) {
      return '\x81' + key + '\x00\x61\x62\x63\x00';
    }); // \x81\x64\x65\x66\x00\x61\x62\x63\x00

  */
  function toFunction(key, lambda) {
    if( lambda.isNative() )
      throw new Error('Cannot encode native function ' + lambda.name + '.');
    return lambda(key);
  };

  /* ********************************************************************** */

  /*
  toNumber( key, value ) -> String

  key -> String
  value -> Number

  Converts a JavaScript number(including Infinity, -Infinity and NaN) into a
  BSON number where numbers between -2147483648 and 2147483647(inclusive)
  are converted into int32 and everything else is converted to double.

  Ex.:
    toNumber('d', 222);         // \x10\x64\x00\xde\x00\x00\x00
    toNumber('p', NaN);         // \x01\x70\x00\x01\x00\x00\x00\x00\x00\xf0\x7f
    toNumber('t', Infinity);    // \x01\x74\x00\x00\x00\x00\x00\x00\x00\xf0\x7f
    toNumber('o', -Infinity);   // \x01\x6f\x00\x00\x00\x00\x00\x00\x00\xf0\xff
    toNumber('l', 22.2);        // \x01\x6c\x00\x33\x33\x33\x33\x33\x33\x36\x40
    toNumber('e', 0x1234567890);// \x01\x65\x00\x00\x00\x90\x78\x56\x34\x32\x42

  */
  function toNumber(key, value) {
    if( ! Number.isFinite( value ) ) {
      return TYPES.DOUBLE.E + key + '\x00' + (
          isNaN(value)
        ? '\x01\x00\x00\x00\x00\x00\xF0\x7F'
        : '\x00\x00\x00\x00\x00\x00\xF0' + ( value === 1/0 ?'\x7F' : '\xFF' )
      );
    }
    if( value < -2147483648 || value > 2147483647 )
      return toNumber.int64(key, value);
    if( ~~value !== value )
      return toNumber.double64(key, value);
    return toNumber.int32(key, value);
  };

  toNumber.int64 = function(key, value, other_type) {
    // An int64 is converted as double64 because JavaScript fails to
    // handle 32bit+ numbers. So it's safer to encode as a double64.
    return toNumber.double64(key, value, other_type);
  };
  toNumber.int32 = function(key, value, other_type) {
    return ( TYPES.INT32.E || other_type ) + key + '\x00'
      + readAsInt32LE(value);
  };
  toNumber.double64 = function( key, value, other_type ) {
    return ( TYPES.DOUBLE.E || other_type ) + key + '\x00'
      + readAsDouble64LE(value);
  };

  /* ********************************************************************** */

  /*
  toObject(key, value) -> String

  key -> String
  value -> Object | Array | Date | RegExp

  Convets a JavaScript object into a BSON object format depending if it's an
  Array, Date, RegExp or a regular JavaScript object.
  Accordingly to the BSON format the RegExp second cstring includes i for
  ignoreCase, m for multiline, x for verbose, l to make \w, \W, locale
  dependent, s for dotall mode ('.' matches everything), and u to make \w, \W,
  etc. match unicode, but in this I just added i, m and g for global matching.

  Ex.:
    toObject('array', [1,2,3])
    // '\x04\x61\x72\x72\x61\x79\x00' ARRAY_TYPE + 'array' + '\x00'
    //   '\x1a\x00\x00\x00'           DOCUMENT_LENGTH
    //     '\x10\x30\x00'             INT32_TYPE + '0'(key name) + '\x00'
    //     '\x01\x00\x00\x00'         1               (key value)
    //     '\x10\x31\x00'             INT32_TYPE + '1'(key name) + '\x00'
    //     '\x02\x00\x00\x00'         2               (key value)
    //     '\x10\x32\x00'             INT32_TYPE + '2'(key name) + '\x00'
    //     '\x03\x00\x00\x00'         3               (key value)
    //   '\x00'                       DOCUMENT_END
    
    toObject('date', new Date(2011, 0))
    // '\x09\x64\x61\x74\x65\x00'           DATE_TYPE + 'date' + '\x00'
    //   '\x00\x81\x4d\x3f\x2d\x01\x00\x00' Int64 value to milliseconds
    
    toObject('regexp', /\+\d+/gm)
    // '\x0b\x72\x65\x67\x65\x78\x70\x00' REGEXP_TYPE + 'regexp' + '\x00'
    //   '\x5c\x2b\x5c\x64\x2b\x00'       '\+\d+' + '\x00'
    //   '\x67x6d\x00'                    'gm' + '\x00'

  */
  function toObject(key, value) {
    if( value instanceof Array ) {
      for(var i = 0, array = {}; i < value.length; i++)
        array[i] = value[i];
      return TYPES.ARRAY.E + key + '\x00' + encode(array);
    }
    if( value instanceof Date )
      return TYPES.UTC_DATETIME.E + key + '\x00'
             + readAsInt64LE( +value );
    if( value === null )
      return TYPES.NULL.E + key + '\x00';
    if( value instanceof RegExp )
      return TYPES.REGEXP.E + key + '\x00'
        + value.source + '\x00'
          + ( value.global     ? 'g' : '' )
          + ( value.ignoreCase ? 'i' : '' )
          + ( value.multiline  ? 'm' : '' )
        + '\x00'
      ;

    return TYPES.DOCUMENT.E + key + '\x00' + encode(value);
  };

  /* ********************************************************************** */

  /*
  toString( key, value[, other_type ] ) -> String

  key -> String
  value -> String
  other_type -> String

  Convets a JavaScript string into a BSON string.
  The other_type argument is used internally only.

  Ex.:
    toString('name', 'dptole')
    // '\x02\x6e\x61\x6d\x65\x00'       STRING_TYPE + 'name' + '\x00'
    //   '\x07\x00\x00\x00'             Int32 string length + 1
    //   '\x64\x70\x74\x6f\x6c\x65\x00' 'dptole' + '\x00'

  */
  function toString(key, value, other_type) {
    return ( other_type || TYPES.STRING.E ) + key + '\x00'
           + readAsInt32LE( value.length + 1 ) + value + '\x00';
  };

  /* ********************************************************************** */

  /*
  toUndefined( key ) -> String

  key -> String

  Converts a JavaScript undefined into a BSON undefined.
  Despite of the BSON undefined type is deprecated the JavaScript undefined is
  not.

  Ex.:
    toUndefined('dp')
    // '\x06\x64\x70\x00'         UNDEFINED_TYPE + 'dp' + '\x00'
    toUndefined('tole')
    // '\x06\x74\x6f\x6c\x65\x00' UNDEFINED_TYPE + 'tole' + '\x00'

  */
  function toUndefined(key) {
    return TYPES.UNDEFINED.E + key + '\x00';
  };

  /* ********************************************************************** */

  global.BSON = {
    encode: function( document ) { return encode( document ); },
    decode: function( bson ) { return decode( Buffer( bson ), false ); },

    get BINARY_TYPE() { return {
      UUID_OLD : TYPES.BINARY.UUID_OLD.E,
      FUNCTION : TYPES.BINARY.FUNCTION.E,
      GENERIC  : TYPES.BINARY.GENERIC.E,
      BINARY   : TYPES.BINARY.BINARY.E,
      UUID     : TYPES.BINARY.UUID.E,
      MD5      : TYPES.BINARY.MD5.E
    } },

    binary: function(data, subtype) {
      if(
        ! ~[
          TYPES.BINARY.FUNCTION.D, TYPES.BINARY.UUID_OLD.D,
          TYPES.BINARY.GENERIC.D,  TYPES.BINARY.BINARY.D,
          TYPES.BINARY.UUID.D,     TYPES.BINARY.MD5.D
        ].indexOf( subtype ) && !( subtype >> 7 )
      ) subtype = TYPES.BINARY.GENERIC.D;

      if( subtype === TYPES.BINARY.UUID_OLD.D )
        subtype = TYPES.BINARY.UUID.D;
      else if( subtype === TYPES.BINARY.BINARY.D )
        subtype = TYPES.BINARY.GENERIC.D;

      return function(key) {
        return ''
          + TYPES.BINARY.E + key + '\x00' + readAsInt32LE(data.length)
          + String.fromCharCode(subtype) + data;
      };
    },

    jsFunction: function(lambda, variables) {
      var lambda_arguments =
        lambda.toString().match(/^function[^(]*\(([^)]*)\)/)[1].split(',');
      return BSON.jsCode( lambda.toString().replace(
        /^function[^(]*\([^)]*\)[^{]*\{|\}[^}]*$/g, ''
      ), variables, lambda_arguments );
    },

    jsCode: function(code, scope, args) {
      return typeof( code ) !== 'function'
        ? function( key ) {
          if( args instanceof Array ) {
            if( typeof( scope ) !== 'object' || scope === null ) scope = {};
            while( args.length )
              scope['arguments[' + ( args.length - 1 ) + ']'] = args.pop();
          }
          if( scope === undefined )
            return toString( key, code, TYPES.JS_CODE.E );

          scope = BSON.encode(scope);
          return ''
            + TYPES.JS_CODE_W_S.E + key + '\x00'
            // The + 10 down there is the sum of 1 + 4 + 5, where:
            // 1 = To the scope trailing byte.
            // 4 = To the length of the length.
            // 5 = To the code length(length of the length(4) + the 0byte(1)).
            + readAsInt32LE( scope.length + code.length + 10 )
            + readAsInt32LE( code.length + 1 ) + code + '\x00'
            + scope;
        }
        : this.jsFunction(code, scope)
      ;
    },

    jsCodeWithScope: function() { return this.jsCode.apply(this, arguments); }
  };

  Object.freeze(global.BSON);
}(this);
