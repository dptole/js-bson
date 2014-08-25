-function( global ) {
  function Binary( data, subtype ) {
    if( ! ( this instanceof Binary ) )
      return new Binary( data, subtype );

    this.toString = function() { return data; };
    this.subtype = subtype;
  };

  global.Binary = Binary;
}( this );