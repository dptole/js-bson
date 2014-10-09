-function( global ) {
  /* 
  Binary( data, subtype ) -> instanceof Binary

  A simple way to represent the BSON binary data in JavaScript.

  data -> String
  subtype -> Number

  Ex.:
    var bin = Binary('binary-data', 4);
    bin.toString().split('').map(function(c){return c.charCodeAt(0)})
    // [98, 105, 110, 97, 114, 121, 45, 100, 97, 116, 97]
    console.log(bin.subtype); // 4

  */
  function Binary( data, subtype ) {
    if( ! ( this instanceof Binary ) )
      return new Binary( data, subtype );

    this.toString = function() { return data; };
    this.subtype = subtype;
  };

  global.Binary = Binary;
}( this );
