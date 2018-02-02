///<reference path="../DynamicGeometry.d.ts" />

interface IConeGeometryOption extends IGeometryOption {
    topRadius?: number;
    bottomRadius?: number;
    height?: number;

    capSegments?: number;
    heightSegements?: number;
}

export class Cone extends DynamicGeometry{

    constructor(option?: IConeGeometryOption);
}