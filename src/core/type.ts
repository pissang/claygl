export type GLEnum = number;
export type Color = number[];

export type Dict<T> = Record<string, T>;
// https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
// https://fettblog.eu/typescript-union-to-intersection/#the-solution
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any
  ? R
  : never;
// https://stackoverflow.com/questions/49401866/all-possible-keys-of-an-union-type
type KeysOfUnion<T> = T extends T ? keyof T : never;
