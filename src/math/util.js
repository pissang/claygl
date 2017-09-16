var mathUtil = {};

mathUtil.isPowerOfTwo = function (value) {
    return (value & (value - 1)) === 0;
};

mathUtil.nextPowerOfTwo = function (value) {
    value --;
    value |= value >> 1;
    value |= value >> 2;
    value |= value >> 4;
    value |= value >> 8;
    value |= value >> 16;
    value ++;

    return value;
};

mathUtil.nearestPowerOfTwo = function (value) {
    return Math.pow( 2, Math.round( Math.log( value ) / Math.LN2 ) );
};

export default mathUtil;
