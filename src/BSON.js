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

  Array.prototype.toLetter = function() {
    return String.fromCharCode.apply(String, this);
  };

  /* ********************************************************************** */

  Function.prototype.isNative = function() {
    return /function[^(]*\([^)]*\)[^{]*\{[^[]*\[native code\][^}]*\}/
      .test( '' + this );
  };

  /* ********************************************************************** */

  function createFunction(code, variables) {
    if( typeof(variables) === 'object' && null !== variables )
      var var_list = []
        , args = []
      ;
      for( var name in variables ) {
        if( /arguments\[\d+\]/.test(name) )
          args.push( variables[name] );
        else
          var_list.push( name + ' = ' + variables[name] );
      }
      
      if(var_list.length)
        var_list = 'var ' + var_list.join('\n  , ') + '\n;\n';
      
      args.push( var_list + code );
      return Function.apply( Function, args );
  };

  /* ********************************************************************** */

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
          ).toArray().toLetter()
      ;
      offset += key.toString().length + 1;
      switch(type) {
        case 0: break;

        case TYPES.JS_CODE_W_S.D:
          var data_type_length = buffer.readInt32LE(offset)
            
            , code_length_offset = offset + 4
            , code_length = buffer.readInt32LE(code_length_offset)
            
            , code_offset = code_length_offset + 4
            , code = buffer.toArray(code_offset, code_length - 1).toLetter()

            , variables_length_offset = code_offset + code.length + 1
            , variables_length = buffer.readInt32LE(variables_length_offset)
            , variables_encoded = buffer.toArray(
                  variables_length_offset,
                  variables_length
                ).toLetter()
            , variables = BSON.decode(variables_encoded)
          ;

          decoded[key] = createFunction(code, variables);
          offset += data_type_length;
        break;

        case TYPES.JS_CODE.D:
          var code_length = buffer.readInt32LE(offset)
            , code = buffer.toArray( offset + 4, code_length - 1 ).toLetter()
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
          decoded[key] = buffer.toArray(start, end).toLetter();

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
          decoded[key] = new RegExp(source.toLetter(), modifiers.toLetter());
          offset += source.length + modifiers.length + 1;
        break;

        default: throw new Error('Unknown type ' + type );
      }

      offset++;
    }

    return decoded;
  };

  /* ********************************************************************** */

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

  function readAsDouble64LE(data) {
    var double64 = []
      , bias = 1023
      , max_bias = 2047
      , sign = data < 0 ? 1 : 0
      , data = Math.abs( data )
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
    return double64.toLetter();
  };

  /* ********************************************************************** */

  function toBoolean(key, value) {
    return TYPES.BOOLEAN.E + key + '\x00' + ( value ? '\x01' : '\x00' );
  };

  /* ********************************************************************** */

  function toFunction(key, lambda) {
    if( lambda.isNative() )
      throw new Error('Cannot encode native function ' + lambda.name + '.');
    return lambda(key);
  };

  /* ********************************************************************** */

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
    encode: function(document) { return encode(document); },
    decode: function(bson) { return decode( Buffer(bson), 0, false ); },

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
