import * as THREE from 'three';
import Example, { SUPPORTED_SHAPES, SupportedShapes } from '../../src/Example';

const example = new Example();
example.createScene();
example.addDummyShape(true);

const { scene, gltflLoader, factory, selector } = example;

let modelWidth: number;

const selectedObject = selector.getSelectedShape();
if (!selectedObject) throw new Error('No selected object');

let model: THREE.Object3D;
const modelGroup = new THREE.Group();
selectedObject.add(modelGroup);

const addObjectsOnShape = () => {
    factory.addObjectsOnShape(modelGroup, model, selectedObject, { width: modelWidth });
};

gltflLoader.load('../../../yellow-fence.glb', (gltf) => {
    model = gltf.scene;

    const box = new THREE.Box3().setFromObject(model);
    modelWidth = box.max.x - box.min.x;
    addObjectsOnShape();
});

selectedObject.addEventListener('vertex-updated', addObjectsOnShape);
