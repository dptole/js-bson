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

  Array.prototype.reverse = Array.prototype.reverse || function() {
    for(var i = 0, tmp = null, pivot = this.length / 2; i < pivot; i ++) {
      tmp = this[ i ];
      this[ i ] = this[ this.length - i - 1 ];
      this[ this.length - i - 1 ] = tmp;
    }
    return this;
  };

  /* ********************************************************************** */

  Object.create = Object.create || function( object ) {
    function F() {}; F.prototype = object; return new F;
  };

  /* ********************************************************************** */

  Function.prototype.isNative = function() {
    return /function[^(]*\([^)]*\)[^{]*\{[^[]*\[native code\][^}]*\}/
      .test( '' + this );
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

  function createFunction( code, variables ) {
    if( typeof( variables ) === 'object' && null !== variables )
      var var_list = []
        , args = []
      ;
      for( var name in variables ) {
        if( /arguments\[\d+\]/.test( name ) )
          args.push( variables[ name ] );
        else
          var_list.push( name + ' = ' + variables[ name ] );
      }
      
      if( var_list.length )
        var_list = 'var ' + var_list.join('\n  , ') + '\n;\n';
      
      args.push( var_list + code );
      return Function.apply( Function, args );
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

    return sign * mantissa * Math.pow(2, exponent - 52);
  };

  /* ********************************************************************** */

  function encode( doc ) {
    return encode.core( doc, Object.getOwnPropertyNames( doc ), '', 0 );
  };
  encode.core = function( document, properties, bson, i ) {
    for(; i < properties.length; i++)
      bson += ENCODE_FUNCTIONS[ typeof( document[ properties[ i ] ] ) ](
        properties[ i ],
        document[ properties[ i ] ]
      );

    return readAsInt32LE( bson.length + 5 ) + bson + '\x00';
  };

  /* ********************************************************************** */

  function decode( buffer, is_array ) {
    var offset = 0
      , key = null
      , type = null
      , decoded = is_array ? [] : {}
      , length = buffer.readInt32LE( offset )
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
        : String.fromCharCode.apply(
            String,
            buffer.sliceWhile(
              function( octect ) { return octect !== 0; }, offset
            ).toArray()
          )
      ;
      offset += key.toString().length + 1;
      switch( type ) {
        case 0: break;

        case TYPES.JS_CODE_W_S.D:
          var data_type_length = buffer.readInt32LE( offset )
            
            , code_length_offset = offset + 4
            , code_length = buffer.readInt32LE( code_length_offset )
            
            , code_offset = code_length_offset + 4
            , code = String.fromCharCode.apply(
                String,
                buffer.toArray( code_offset, code_length - 1 )
              )
            
            , variables_length_offset = code_offset + code.length + 1
            , variables_length = buffer.readInt32LE( variables_length_offset )
            , variables_encoded = String.fromCharCode.apply(
                String,
                buffer.toArray( variables_length_offset, variables_length )
              )
            , variables = BSON.decode( variables_encoded )
          ;

          decoded[ key ] = createFunction( code, variables );
          offset += data_type_length;
        break;

        case TYPES.JS_CODE.D:
          var code_length = buffer.readInt32LE( offset )
            , code = String.fromCharCode.apply(
                String,
                buffer.toArray( offset + 4, code_length - 1 )
              )
          ;
          decoded[ key ] = Function( code );
          offset += code_length + 4;
        break;

        case TYPES.BINARY.D:
        case TYPES.STRING.D:
          var start = offset + 4 + ( TYPES.BINARY.D === type )
            , end =
                buffer.readInt32LE( offset )
                - (TYPES.STRING.D === type)
          ;

          decoded[ key ] = String.fromCharCode.apply(
            String, buffer.toArray( start, end )
          );

          if( TYPES.BINARY.D === type )
            decoded[ key ] = Binary(
              decoded[ key ],
              buffer.pick( offset + 4 )
            );

          offset += decoded[ key ].length + 4;
        break;

        case TYPES.DOCUMENT.D:
        case TYPES.ARRAY.D:
          var _offset = buffer.readInt32LE( offset );
          decoded[ key ] = decode(
            buffer.slice( offset, _offset ), TYPES.ARRAY.D === type
          );
          offset += _offset - 1;
        break;

        case TYPES.BOOLEAN.D:
          decoded[ key ] = !!buffer.pick( offset );
        break;

        case TYPES.UNDEFINED.D:
        case TYPES.NULL.D:
          decoded[ key ] = TYPES.NULL.D === type ? null : undefined;
          offset--;
        break;

        case TYPES.INT32.D:
          decoded[ key ] = buffer.readInt32LE( offset, 4 ); offset += 3;
        break;

        case TYPES.UTC_DATETIME.D:
        case TYPES.INT64.D:
          decoded[ key ] = buffer.readInt64LE( offset );
          if( TYPES.UTC_DATETIME.D === type )
            decoded[ key ] = new Date( decoded[ key ] );
          offset += 7;
        break;

        case TYPES.REGEXP.D:
          var source = buffer.sliceWhile(
                function( octect ) { return octect !== 0; }, offset
              ).toArray()
            , modifiers = buffer.sliceWhile(
                function( octect ) { return octect !== 0; }
                , offset + source.length + 1
              ).toArray()
          ;
          decoded[ key ] = new RegExp(
            String.fromCharCode.apply( String, source ),
            String.fromCharCode.apply( String, modifiers )
          );
          offset += source.length + modifiers.length + 1;
        break;

        case TYPES.DOUBLE.D:
          decoded[ key ] = buffer.readFloat64LE( offset );
          offset += 7;
        break;

        default: throw new Error('Unknown type ' + type );
      }

      offset++;
    }

    return decoded;
  };

  /* ********************************************************************** */

}( this );
