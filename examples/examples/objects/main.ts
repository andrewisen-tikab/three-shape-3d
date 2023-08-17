import * as THREE from 'three';
import Example from '../../src/Example';
import ObjectsOnShapeFactory from '../../src/ObjectsOnShapeFactory';

const example = new Example();
example.createScene();
example.addDummyShape(true);

const { gltflLoader, selector } = example;

let modelWidth: number;

const selectedObject = selector.getSelectedShape();
if (!selectedObject) throw new Error('No selected object');

let model: THREE.Object3D;
const modelGroup = new THREE.Group();
selectedObject.add(modelGroup);

const objectsOnShapeFactory = new ObjectsOnShapeFactory();

const addObjectsOnShape = () => {
    objectsOnShapeFactory.addObjectsOnShape(modelGroup, model, selectedObject, {
        width: modelWidth,
    });
};

gltflLoader.load('../../../yellow-fence.glb', (gltf) => {
    model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    modelWidth = box.max.x - box.min.x;
    addObjectsOnShape();
});

selectedObject.addEventListener('vertex-updated', addObjectsOnShape);
