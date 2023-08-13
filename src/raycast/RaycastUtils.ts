import type Shape3D from '../core/Shape3D';

interface Shape3DChild extends THREE.Object3D {
    shape3DParent: Shape3D;
}

/**
 * Set the parent of a {@link THREE.Object3D} to a {@link Shape3D}.
 * @param object Object to set the parent of.
 * @param parent Parent to set.
 */
const setShape3DParent = (object: THREE.Object3D, parent: Shape3D): void => {
    (object as Shape3DChild).shape3DParent = parent;
};

/**
 * Get the parent of a {@link THREE.Object3D} as a {@link Shape3D}.
 * @param object Object to get the parent of.
 * @returns Parent of the object as a {@link Shape3D}.
 */
const getShape3DParent = (object: THREE.Object3D): Shape3D | undefined => {
    return (object as Shape3DChild).shape3DParent;
};

/**
 * An object with several raycast utility functions.
 */
const RaycastUtils = {
    setShape3DParent,
    getShape3DParent,
} as const;

export default RaycastUtils;
