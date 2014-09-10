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

  function Buffer( buffer ) {
    if( ! ( this instanceof Buffer ) )
      return new Buffer( buffer );

    for(
      var _buffer = [], i = 0;
      i < buffer.length;
      _buffer[ i ] = buffer.charCodeAt( i++ )
    );

    this.slice = function( start, end ) {
      if( start !== undefined ) if( end !== undefined ) end += start;
      return Buffer( buffer.slice( start, end ) );
    };

    this.sliceWhile = function( callback, start, end ) {
      for(
        now_sliced = null, sliced = [], slice = this.toArray(start, end);
        slice && slice.length &&
        ( now_sliced = slice.shift() ) && callback( now_sliced );
        sliced.push( now_sliced )
      );
      return Buffer( String.fromCharCode.apply( String, sliced ) );
    };

    this.toArray = function( start, end ) {
      if( start !== undefined ) if( end !== undefined ) end += start;
      return _buffer.slice( start, end );
    };
  };

  Buffer.prototype = {
    constructor: Buffer,
    get length() { return this.toArray().length; },
    pick: function( start ) {
      start = +start; return this.toArray( start, start + 1 )[ 0 ];
    },
    readInt32LE:   function(start) {return readInt(this.toArray(start,4))},
    readInt64LE:   function(start) {return readInt(this.toArray(start,8))},
    readFloat64LE: function(start) {return readFloat(this.toArray(start,8))}
  };

  /* ********************************************************************** */

  function readInt( buffer ) {
    for(var i = 0, value = 0; i < buffer.length;)
      value += buffer[ i ] * Math.pow( 2, 8 * i++ );

    return value;
  };

  /* ********************************************************************** */

  function readFloat( buffer ) {
    var buffer = buffer.reverse()
      , sign = ( buffer[ 0 ] >> 7 ) > 0 ? -1 : 1
      , bias = 1023
      , i = 0
      , exponent = ( ( buffer[ i++ ] & 127 ) * 256 + buffer[ i++ ] )
      , mantissa = exponent & 15
    ;
    exponent >>= 4;

    for(; buffer[ i ] !== undefined ; mantissa = mantissa * 256 + buffer[ i++ ] );

    if( exponent === 0 )
      exponent = 1 - bias;
    else if( exponent === 2047 )
      return mantissa ? 0 / 0 : sign * ( 1 / 0 );
    else {
      mantissa = mantissa + 4503599627370496;
      exponent -= bias;
    }

    buffer = buffer.reverse();
    return sign * mantissa * Math.pow(2, exponent - 52);
  };

  /* ********************************************************************** */

  function Binary( data, subtype ) {
    if( ! ( this instanceof Binary ) )
      return new Binary( data, subtype );

    this.toString = function() { return data; };
    this.subtype = subtype;
  };

  /* ********************************************************************** */

  function Int64(buffer) {
    if( ! ( this instanceof Int64 ) )
      return new Int64(buffer);

    this.buffer = function() {return buffer;};
  };

  Int64.prototype = {
    toString: function() {
      var buffer = this.buffer()
        , instance = Digit( buffer[ 0 ].toString() )
      ;

      if( buffer[ buffer.length - 1 ] >> 7 )
        instance.subtract( OCTECTS_VALUE[ buffer.length - 1 ] );

      OCTECTS_VALUE.forEach(function( value, index ) {
        if( buffer[ index + 1 ] === undefined ) return false;
        instance.sum( Digit( value ).multiply( buffer[ index + 1 ] ) );
      });

      return instance.number;
    },
    toNumber: function() {
      // The final number may not be precise because JavaScript fails to
      // handle 32bit+ numbers. So it's safer to call toString instead.
      var buffer = this.buffer()
        , value = buffer[0]
        , array_buffer = buffer.slice(1)
      ;

      if( buffer[ buffer.length - 1 ] >> 7 )
        value -= Math.pow(2, 8 * ( buffer.length ) );

      array_buffer.forEach(function( val, index ) {
        value += val * Math.pow(2, 8 * ( index + 1 ) );
      });

      return value;
    }
  };

  /* ********************************************************************** */

  function Digit( number ) {
    if( ! /^[-+]?\d+(\.\d+)?$/.test( number.toString() ) )
      throw new Error('Invalid number ' + number);

    if( ! ( this instanceof Digit ) )
      return new Digit( number );
    if( number instanceof Digit )
      return number;

    if( typeof( number ) === 'number' )
      number = number.toString();

    this.number = number;
  };

  /* ********************************************************************** */

  Digit.prototype = {
    constructor: Digit,
    number: '0',
    toNumber: function() { return +this.number; },
    toString: function() { return this.number; },
    sum: function( number ) {
      this.number = sum( this.toString(), number.toString() );
      return this;
    },
    subtract: function( number ) {
      this.number = subtract( this.toString(), number.toString() );
      return this;
    },
    multiply: function( number ) {
      this.number = multiply( this.toString(), number.toString() );
      return this;
    },
    compare: function( number ) {
      return compare( this.toString(), number.toString() );
    }
  };

  /* ********************************************************************** */

  Digit.fromBuffer = function( buffer ) {
    if( buffer.length !== 4 && buffer.length !== 8 )
      throw new Error('Invalid buffer length');
    
    var instance = Digit( buffer[ 0 ].toString() );
    
    OCTECTS_VALUE.forEach(function( value, index ) {
      if( buffer[ index + 1 ] === undefined ) return false;
      instance.sum( Digit( value ).multiply( buffer[ index + 1 ] ) );
    });
    
    if( buffer[ buffer.length - 1 ] >> 7 )
      instance.subtract( OCTECTS_VALUE[ buffer.length - 1 ] );
    
    return instance;
  };

  /* ********************************************************************** */

  function compare( first_number, second_number ) {
    var equalized_width = equalizeWidth( first_number, second_number );
    var i = 0;

    first_number = equalized_width[1];
    second_number = equalized_width[3];

    do {
      if( first_number[i] > second_number[i] ) return -1;
      if( second_number[i] > first_number[i] ) return 1;
    } while( ++i < first_number.length );

    return 0;
  };

  /* ********************************************************************** */

  function sum( first_number, second_number ) {
    var equalized_width = equalizeWidth(first_number, second_number)
      , result = []
    ;

    first_number = equalized_width[1];
    second_number = equalized_width[3];

    if( equalized_width[0] === '-' ) {
      if( equalized_width[2] === '-' )
        return '-' + sum( first_number, second_number );
      return subtract( second_number, first_number );
    } else if( equalized_width[2] === '-' )
      return subtract( first_number, second_number );

    first_number = first_number.split('').reverse();
    second_number = second_number.split('').reverse();

    first_number.forEach(function( number, index ) {
      result.push(
        + ( number | 0 )
        + + ( second_number[ index ] | 0 )
        + + ( result[ index - 1 ] > 9 | 0 )
      );

      if( index && result[ index - 1 ] > 9 )
        result[ index - 1 ] -= 10;
    });

    if( result[ result.length - 1 ] > 9 ) {
      result[ result.length - 1 ] -= 10;
      result.push(1);
    }

    return parseResult( '', result, equalized_width[4] );
  };

  /* ********************************************************************** */

  function subtract( higher_number, lower_number ) {
    var result = []
      , sign = ''
      , equalized_width = equalizeWidth(higher_number, lower_number)
    ;

    higher_number = equalized_width[1];
    lower_number = equalized_width[3];

    if( equalized_width[0] === '-' ) {
      if( equalized_width[2] === '-' )
        return subtract( lower_number, higher_number );
      return '-' + sum( higher_number, lower_number );
    } else if( equalized_width[2] === '-' )
      return sum( higher_number, lower_number );

    if( higher_number < lower_number ) {
      var tmp = lower_number;
      lower_number = higher_number;
      higher_number = tmp;
      sign = '-';
    }

    higher_number = higher_number.split('').reverse();
    lower_number = lower_number.split('').reverse();

    higher_number.forEach(function( number, index ) {
      number |= 0;
      lower_number[ index ] |= 0;
      
      if( number - lower_number[ index ] < 0 ) {
        number += 10;
        higher_number[ index + 1 ]--;
      }
      
      result.push(
        + number
        - lower_number[ index ]  
      );
    });

    return parseResult( sign, result, equalized_width[4] );
  };

  /* ********************************************************************** */

  function multiply( first_number, second_number ) {
    var sub_result = []
      , sign = ''
      , result = '0'
      , equalized_width = equalizeWidth(first_number, second_number)
    ;

    first_number = equalized_width[1].split('').reverse();
    second_number = equalized_width[3].split('').reverse();

    if(
      ( equalized_width[0] === '-' && equalized_width[2] === '' ) ||
      ( equalized_width[0] === '' && equalized_width[2] === '-' )
    ) sign = '-';

    first_number.forEach(function( number1, index ) {
      second_number.forEach(function( number2, index ) {
        sub_result.push(
          + ( number1 | 0 )
          * ( number2 | 0 )
          + (
              sub_result[ index - 1 ] > 9
              ? sub_result[ index - 1 ] / 10
              : 0
            ) >> 0
        );

        if( index && sub_result[ index - 1 ] > 9 )
          sub_result[ index - 1 ] %= 10;
      });

      while( index-- > 0 ) sub_result.unshift(0);
      result = sum( result, sub_result.reverse().join('') );
      sub_result = [];
    });

    return parseResult(
      sign,
      result.split('').reverse(),
      equalized_width[4] * 2
    );
  };

  /* ********************************************************************** */

  function parseResult( sign, array_result, decimal_places ) {
    array_result.reverse();

    if( decimal_places ) {
      array_result.splice(-decimal_places, 0, '.');
      array_result = array_result.join('').replace(/0+$/, '');
    } else array_result = array_result.join('');

    return ( sign + array_result.replace(/^[0.]+|\.$/g, '') ) || '0';
  };

  /* ********************************************************************** */

  function equalizeWidth( first_number, second_number ) {
    var first_sign = first_number.match(SIGN_NEG_EXP) && RegExp.$1
      , second_sign = second_number.match(SIGN_NEG_EXP) && RegExp.$1
      , first_int_float = first_number.split('.')
      , second_int_float = second_number.split('.')
    ;

    if( first_int_float.length === 1 ) first_int_float.push('');
    if( second_int_float.length === 1 ) second_int_float.push('');

    first_int = first_int_float[0].replace(SIGN_EXP, '');
    first_float = first_int_float[1];
    second_int = second_int_float[0].replace(SIGN_EXP, '');
    second_float = second_int_float[1];

    while( first_float.length < second_float.length )
      first_float += '0';
    while( second_float.length < first_float.length )
      second_float += '0';

    while( first_int.length < second_int.length )
      first_int = '0' + first_int;
    while( second_int.length < first_int.length )
      second_int = '0' + second_int;

    return [
      first_sign, first_int + first_float,
      second_sign, second_int + second_float,
      first_float.length
    ];
  };

  /* ********************************************************************** */

  SIGN_EXP = /^([+-]?)/;
  SIGN_NEG_EXP = /^(\-?)/;
  OCTECTS_VALUE = [
    '256', // 8
    '65536', // 16
    '16777216', // 24
    '4294967296', // 32
    '1099511627776', // 40
    '281474976710656', // 48
    '72057594037927936', // 56
    '18446744073709551616', // 64
  ];

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

  Ex.:
    var document = BSON.encode({
      eggs: true,
      bacon: "spam spam spam spam spam",
      knights: [{
        name: "Knight 1", atk: 10, def: 5
      }, {
        name: "Knight 2", atk: 5, def: 10
      }]
    }); // BSON stuff
    var object = BSON.decode( document ); // JavaScript object

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

  Read the given number and return a IEEE754 double precision
  version of it as string.

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

  Converts boolean values to BSON format.

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

  Convert a number(including Infinity, -Infinity and NaN) to the BSON format
  where numbers between -2147483648 and 2147483647(inclusive) are converted
  into int32 and everything else is converted to double.

  Ex.:
    toNumber('d', 222);         // \x10\x64\x00\xde\x00\x00\x00
    toNumber('p', NaN);         // \x01\x70\x00\x01\x00\x00\x00\x00\x00\xf0\x7f
    toNumber('t', Infinity);    // \x01\x74\x00\x00\x00\x00\x00\x00\x00\xf0\x7f
    toNumber('o', -Infinity);   // \x01\x6f\x00\x00\x00\x00\x00\x00\x00\xf0\xff
    toNumber('l', 22.2);        // \x01\x6c\x00\x33\x33\x33\x33\x33\x33\x36\x40
    toNumber('e', 0x1234567890);// \x01\x65\x00\x00\x00\x90\x78\x56\x34\x32\x42

  */
  function toNumber(key, value, other_type) {
    if( ! Number.isFinite( value ) ) {
      return ( other_type || TYPES.DOUBLE.E ) + key + '\x00' + (
          isNaN(value)
        ? '\x01\x00\x00\x00\x00\x00\xF0\x7F'
        : '\x00\x00\x00\x00\x00\x00\xF0' + ( value === 1/0 ?'\x7F' : '\xFF' )
      );
    }
    if( value < -2147483648 || value > 2147483647 )
      return toNumber.int64(key, value, other_type);
    if( ~~value !== value )
      return toNumber.double64(key, value, other_type);
    return toNumber.int32(key, value, other_type);
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
      return ''
        + TYPES.REGEXP.E + key + '\x00'
        + value.source + '\x00'
          + ( value.global     ? 'g' : '' )
          + ( value.ignoreCase ? 'i' : '' )
          + ( value.multiline  ? 'm' : '' )
        + '\x00'
      ;

    return TYPES.DOCUMENT.E + key + '\x00' + encode(value);
  };

  /* ********************************************************************** */

  function toString(key, value, other_type) {
    return ( other_type || TYPES.STRING.E ) + key + '\x00'
           + readAsInt32LE( value.length + 1 ) + value + '\x00';
  };

  /* ********************************************************************** */

  function toUndefined(key, _) {
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
          TYPES.BINARY.FUNCTION.E,
          TYPES.BINARY.UUID_OLD.E,
          TYPES.BINARY.GENERIC.E,
          TYPES.BINARY.BINARY.E,
          TYPES.BINARY.UUID.E,
          TYPES.BINARY.MD5.E
        ].indexOf( subtype ) && !( subtype >> 7 )
      ) subtype = TYPES.BINARY.GENERIC.E;
      
      else if( subtype === TYPES.BINARY.UUID_OLD.E )
        subtype === TYPES.BINARY.UUID.E
      
      else if( subtype === TYPES.BINARY.BINARY.E )
        subtype === TYPES.GENERIC.UUID.E
      
      return function(key) {
        return ''
          + TYPES.BINARY.E + key + '\x00' + readAsInt32LE(data.length)
          + subtype + data;
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
