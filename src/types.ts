import * as THREE from 'three';

/**
 * TBD. This is a placeholder for now.
 */
export type Vertex = THREE.Vector3Tuple;
export type HEX = number;
export type ColorRepresentation = HEX;

export const SUPPORTED_SHAPES = { LINE: 'line', AREA: 'area', VOLUME: 'volume' } as const;
export type SupportedShapes = (typeof SUPPORTED_SHAPES)[keyof typeof SUPPORTED_SHAPES];

export type Shape3DParams = {
    vertices: Vertex[];
    shape: SupportedShapes;
    primaryColor: ColorRepresentation;
    secondaryColor: ColorRepresentation;
    closeLine: boolean;
    volumeHeight: number;
};
