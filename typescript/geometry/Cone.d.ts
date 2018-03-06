import { Geometry } from '../Geometry'

interface IConeGeometryOption {
    topRadius?: number;
    bottomRadius?: number;
    height?: number;

    capSegments?: number;
    heightSegements?: number;
}

export class Cone extends Geometry {

    constructor(option?: IConeGeometryOption);

    topRadius?: number;
    bottomRadius?: number;
    height?: number;

    capSegments?: number;
    heightSegements?: number;
}