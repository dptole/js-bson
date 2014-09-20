-function( global ) {
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

    return value - (
      buffer[buffer.length - 1] > 127 && (
        buffer.length === 4 || buffer.length === 8 )
      ? Math.pow(2, buffer.length * 8)
      : 0
    );
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

  global.Buffer = Buffer;
}( this );
