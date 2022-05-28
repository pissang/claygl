// Temporal Super Sample for static Scene

// Generate halton sequence
// https://en.wikipedia.org/wiki/Halton_sequence

export default function halton(index: number, base: number) {
  var result = 0;
  var f = 1 / base;
  var i = index;
  while (i > 0) {
    result = result + f * (i % base);
    i = Math.floor(i / base);
    f = f / base;
  }
  return result;
}
