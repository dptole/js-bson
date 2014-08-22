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

  function Binary( data, subtype ) {
    if( ! ( this instanceof Binary ) )
      return new Binary( data, subtype );

    this.toString = function() { return data; };
    this.subtype = subtype;
  };

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

}( this );
