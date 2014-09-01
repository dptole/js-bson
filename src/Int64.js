-function( global ) {
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

  global.Int64 = Int64;
  Object.freeze(global.Int64);
}( this );
