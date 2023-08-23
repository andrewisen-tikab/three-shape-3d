import * as THREE from 'three';
import Example from '../../src/Example';
import ObjectsOnShapeFactory from '../../src/ObjectsOnShapeFactory';

const example = new Example();
example.createScene();
example.addDummyShape(true);

const { gltflLoader, selector, transformShapeControls } = example;

let modelWidth: number;

const selectedShape3D = selector.getSelectedShape();
if (!selectedShape3D) throw new Error('No selected object');

let model: THREE.Object3D;
const modelGroup = new THREE.Group();
selectedShape3D.add(modelGroup);

const objectsOnShapeFactory = new ObjectsOnShapeFactory();
objectsOnShapeFactory.setPoolPosition([0, -1_000_000, 0]);

const addObjectsOnShape = () => {
    beginPool();
    adjustPool();
    // endPool();
};

const beginPool = () => {
    objectsOnShapeFactory.beginPool(modelGroup, model, selectedShape3D, { width: modelWidth });
};

const adjustPool = () => {
    objectsOnShapeFactory.adjustPool(selectedShape3D, { width: modelWidth });
};

const endPool = () => {
    objectsOnShapeFactory.endPool();
};

gltflLoader.load('../../../metal-fence.glb', (gltf) => {
    model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    modelWidth = box.max.z - box.min.z;

    addObjectsOnShape();
});

// selectedObject.addEventListener('vertex-updated', addObjectsOnShape);
transformShapeControls.addEventListener('mouseDown', beginPool);
transformShapeControls.addEventListener('vertexChange', adjustPool);

transformShapeControls.addEventListener('mouseUp', endPool);
