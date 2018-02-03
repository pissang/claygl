export interface IList<T> {
    [index: number]: T;
    length: number;
}

export interface IDictionary<T> {
    [index: string]: T;
}