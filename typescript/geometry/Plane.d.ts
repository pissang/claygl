import { Geometry } from '../Geometry'

interface IPlaneGeometryOption {
    widthSegments?: number;
    heightSegements?: number;
}

export class Plane extends Geometry {

    constructor(option?: IPlaneGeometryOption);

    widthSegments?: number;
    heightSegements?: number;
}