import * as THREE from 'three';

/**
 * TBD. This is a placeholder for now.
 */
export type Vertex = THREE.Vector3Tuple;
export type HEX = number;
export type ColorRepresentation = HEX;

export type Appearance = {
    alwaysShowLine: boolean;
    alwaysShowArea: boolean;
};

export type Shape3DParams = {
    vertices: Vertex[];

    lineColor: ColorRepresentation;
    areaColor: ColorRepresentation;
    volumeColor: ColorRepresentation;
    closeLine: boolean;
    volumeHeight: number;
    appearance: Appearance;
};
