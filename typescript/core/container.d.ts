declare module qtek {
    
    interface IList<T> {
        [index: number]: T;
        length: number;
    }

    interface IDictionary<T> {
        [index: string]: T;
    }

}