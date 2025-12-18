export type GLEnum = number;
export type Color = number[];

export type Dict<T> = Record<string, T>;
// https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
// https://fettblog.eu/typescript-union-to-intersection/#the-solution
export type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

export type StringKeyOf<T> = keyof T & string;
