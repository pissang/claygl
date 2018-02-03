import { Geometry } from '../Geometry'

interface ICubeGeometryOption {
    widthSegments?: number;
    heightSegements?: number;
    depthSegments?: number;
    inside?: boolean;
}

export class Cube extends Geometry {

    constructor(option?: ICubeGeometryOption);

    widthSegments?: number;
    heightSegements?: number;
    depthSegments?: number;
    inside?: boolean;

}