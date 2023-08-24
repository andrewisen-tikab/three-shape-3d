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

export type AddObjectsOnShapeParams = {
    /**
     * The width of the shape.
     * This is used to calculate the number of objects to add on the shape.
     *
     * N.B: You can use the bounding box to get a good approximation of the width.
     */
    width: number;
    /**
     * The spacing **between (!)** the objects, not including the object's width.
     */
    spacing: number;
};
