const {toByteArray} = require('base64-js');

function base64ToBinary(input) {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(130);
    for (var i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }
    // Ignore
    var len = input.length;
    if (input.charAt(len - 1) === '=') {
        len--;
    }
    if (input.charAt(len - 1) === '=') {
        len--;
    }

    var uarray = new Uint8Array((len / 4) * 3);

    for (var i = 0, j = 0; i < uarray.length;) {
        var c1 = lookup[input.charCodeAt(j++)];
        var c2 = lookup[input.charCodeAt(j++)];
        var c3 = lookup[input.charCodeAt(j++)];
        var c4 = lookup[input.charCodeAt(j++)];

        uarray[i++] = (c1 << 2) | (c2 >> 4);
        uarray[i++] = ((c2 & 15) << 4) | (c3 >> 2);
        uarray[i++] = ((c3 & 3) << 6) | c4;
    }

    return uarray.buffer;
}

var data = new Float32Array(11565);
for (let i = 0; i < data.length; i++) {
    data[i] = Math.random();
}
const str = new Buffer(data.buffer).toString('base64');
// console.log(str);
console.time('native');
console.log(new Buffer(str, 'base64'));
console.timeEnd('native');
console.time('js');
console.log(base64ToBinary(str).byteLength);
console.timeEnd('js');

console.time('base64-js');
console.log(toByteArray(str).buffer.byteLength);
console.timeEnd('base64-js');

var result = new Float32Array(base64ToBinary(str));
for (var i = 0; i < result.length; i++) {
    if (result[i] !== data[i]) {
        console.error('wrong result');
        break;
    }
}