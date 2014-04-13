///<reference path="../Shader.d.ts" />
declare module qtek {

    export module shader {

        interface IShaderLibraryOption {
            textures?: string[];
            vertexDefines?: object;
            fragmentDefines?: object;
        }

        export module library {

            export function get(name: string, string[]): Shader;
            export function get(name: string, ...args: string[]): Shader;
            export function get(name: string, option: IShaderLibraryOption): Shader;
            export function get(name: string): Shader;

            export function put(name: string, vertex: string, fragment: string): void;
        }
    }
}