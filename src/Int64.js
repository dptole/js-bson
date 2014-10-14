-function( global ) {
  /*
  Int64( buffer ) -> instanceof Int64

  A simple way to represent int64 numbers in JavaScript. This is meant to
  fulfill the needs of this BSON implementation only.

  buffer -> Array
    This is a big endian buffer of octets.

  Ex.:
    var i64 = Int64([0x90, 0xAB, 0x12, 0xCD, 0, 0, 0, 0]);
    console.log(i64.toString()); // "3440552848"

  More info:
    <http://migre.me/lukzt>

  */
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
        instance.subtract( OCTETS_VALUE[ buffer.length - 1 ] );

      OCTETS_VALUE.forEach(function( value, index ) {
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

  /* ********************************************************************
  ** */

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
    
    OCTETS_VALUE.forEach(function( value, index ) {
      if( buffer[ index + 1 ] === undefined ) return false;
      instance.sum( Digit( value ).multiply( buffer[ index + 1 ] ) );
    });
    
    if( buffer[ buffer.length - 1 ] >> 7 )
      instance.subtract( OCTETS_VALUE[ buffer.length - 1 ] );
    
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

  var SIGN_EXP = /^([+-]?)/;
  var SIGN_NEG_EXP = /^(\-?)/;
  var OCTETS_VALUE = [
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

  global.Int64 = Int64;
}( this );
