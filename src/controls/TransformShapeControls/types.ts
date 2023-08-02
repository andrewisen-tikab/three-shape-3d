import VertexObject from './vertex';

export type Mode = 'none' | 'translate' | 'rotate' | 'scale';

export type TransformShapeControlsGizmoParams = {
    centerGizmo: boolean;
    dragVertices: boolean;
    allowCreatingNewVertices: boolean;
    showLengthLabels: boolean;
    showAngleLabels: boolean;
};

export interface LastSelectedVertex extends THREE.Mesh {
    parent: VertexObject;
}
