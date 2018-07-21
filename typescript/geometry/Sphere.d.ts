import { Geometry } from '../Geometry'


interface ISphereGeometryOption {
    widthSegments?: number;
    heightSegments?: number;

    phiStart?: number;
    phiLength?: number;

    thetaStart?: number;
    thetaLength?: number;

    radius?: number;
}

export class Sphere extends Geometry {

    constructor(option?: ISphereGeometryOption);

    widthSegments?: number;
    heightSegments?: number;

    phiStart?: number;
    phiLength?: number;

    thetaStart?: number;
    thetaLength?: number;

    radius?: number;
}