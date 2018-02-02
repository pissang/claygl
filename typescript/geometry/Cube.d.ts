///<reference path="../DynamicGeometry.d.ts" />

interface ICubeGeometryOption extends IGeometryOption {
    widthSegments?: number;
    heightSegements?: number;
    depthSegments?: number;
    inside?: boolean;
}

export class Cube extends DynamicGeometry{

    constructor(option?: ICubeGeometryOption);
}