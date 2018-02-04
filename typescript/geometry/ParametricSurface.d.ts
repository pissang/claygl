import { Geometry } from '../Geometry'


interface IParametricSurfaceGenerator {
    x: (u: number, v: number) => number;
    y: (u: number, v: number) => number;
    z: (u: number, v: number) => number;

    u: number[];
    v: number[];
}

interface IParametricSurfaceOption {
    generator: IParametricSurfaceGenerator
}

export class ParametricSurface extends Geometry {

    constructor(option?: IParametricSurfaceOption);

    generator: IParametricSurfaceGenerator;
}