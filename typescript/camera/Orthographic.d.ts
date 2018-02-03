
import { Camera, ICameraOption } from '../Camera';

interface IOrthographicCameraOption extends ICameraOption {
    left?: number;
    right?: number;
    near?: number;
    far?: number;
    top?: number;
    bottom?: number;
}

export class Orthographic extends Camera {

    constructor(option?: IOrthographicCameraOption);

    left: number;

    right: number;

    near: number;

    far: number;

    top: number;

    bottom: number;

}