import { Geometry } from '../Geometry'

interface ICubeGeometryOption {
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
    inside?: boolean;
}

export class Cube extends Geometry {

    constructor(option?: ICubeGeometryOption);

    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
    inside?: boolean;

}