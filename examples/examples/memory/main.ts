import { Shape3D } from '../../../src';
import Example from '../../src/Example';

const example = new Example();
example.initAsync();
example.createScene();
example.memoryTest();

const { gui } = example;
const memoryParams = {
    addShapes: true,
    reset: () => {
        const { group } = example;
        group.children.forEach((_child) => {
            const child = _child as Shape3D;
            if (!child.isShape3D) return;
            group.remove(child);
            child.dispose();
        });
        group.clear();
        example.createScene();
        bound = 0.01;
    },
};
const memoryFolder = gui.addFolder('Memory Test');
memoryFolder.add(memoryParams, 'addShapes').name('Add Shapes (test memory)');
memoryFolder.add(memoryParams, 'reset').name('Reset');

let bound = 1;
setInterval(() => {
    if (!memoryParams.addShapes) return;
    example.memoryTest(bound);
    bound += 0.01;
}, 5);
