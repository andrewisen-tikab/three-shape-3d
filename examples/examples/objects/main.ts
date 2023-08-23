import * as THREE from 'three';
import Example from '../../src/Example';
import ObjectsOnShapeFactory from '../../src/ObjectsOnShapeFactory';

const example = new Example();
example.createScene();
example.addDummyShape(true);

const { gltflLoader, selector, transformShapeControls } = example;

let modelWidth: number;

// We will use the selected object as the shape to place objects on.
const selectedShape3D = selector.getSelectedShape();
if (!selectedShape3D) throw new Error('No selected object');

/**
 * The model is loaded asynchronously, so we need to keep a reference to it.
 */
let model: THREE.Object3D;
/**
 * We will add the objects to a group, so we can easily remove them.
 */
const modelGroup = new THREE.Group();
selectedShape3D.add(modelGroup);

// A custom factory to create the objects on the shape.
const objectsOnShapeFactory = new ObjectsOnShapeFactory();
objectsOnShapeFactory.setPoolPosition([0, -1_000_000, 0]);

/**
 * Handle the creation of the objects on the shape.
 */
const addObjectsOnShape = () => {
    beginPool();
    adjustPool();
    // endPool();
};

/**
 * Called when **before (!)** the user starts to drag the shape.
 */
const beginPool = () => {
    objectsOnShapeFactory.preparePool(modelGroup, model, selectedShape3D, { width: modelWidth });
};

/**
 * Called when the user drags the shape.
 */
const adjustPool = () => {
    objectsOnShapeFactory.adjustPoolMatrices(selectedShape3D, { width: modelWidth });
};

/**
 * Called when the user stops dragging the shape.
 */
const endPool = () => {
    objectsOnShapeFactory.endPool();
};

// Setup event listeners.
// selectedObject.addEventListener('vertex-updated', addObjectsOnShape);
transformShapeControls.addEventListener('mouseDown', beginPool);
transformShapeControls.addEventListener('vertexChange', adjustPool);

transformShapeControls.addEventListener('mouseUp', endPool);

// Finally, load the model.
gltflLoader.load('../../../metal-fence.glb', (gltf) => {
    model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    modelWidth = box.max.z - box.min.z;

    addObjectsOnShape();
});
