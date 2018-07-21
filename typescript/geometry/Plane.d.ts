import { Geometry } from '../Geometry'

interface IPlaneGeometryOption {
    widthSegments?: number;
    heightSegments?: number;
}

export class Plane extends Geometry {

    constructor(option?: IPlaneGeometryOption);

    widthSegments?: number;
    heightSegments?: number;
}