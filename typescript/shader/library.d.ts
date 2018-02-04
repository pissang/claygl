import { Shader } from '../Shader';

interface IShaderLibraryOption {
    textures?: string[];
    vertexDefines?: Object;
    fragmentDefines?: Object;
}

export module library {

    export function get(name: string): Shader;

    export function put(name: string, vertex: string, fragment: string): void;
}