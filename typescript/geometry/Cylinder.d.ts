import { Geometry } from '../Geometry'

interface ICylinderGeometryOption {
    radius?: number;
    height?: number;

    capSegments?: number;
    heightSegments?: number;
}

export class Cylinder extends Geometry {

    constructor(option?: ICylinderGeometryOption);

    radius?: number;
    height?: number;

    capSegments?: number;
    heightSegments?: number;
}