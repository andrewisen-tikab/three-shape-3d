import Example from '../../src/Example';

const example = new Example();
example.createScene();

const { gui, params } = example;
const actionsFolder = gui.addFolder('Actions');
actionsFolder.add(params, 'createNewLine').name('Create new Line');
actionsFolder.add(params, 'createNewArea').name('Create new Area');
actionsFolder.add(params, 'createNewVolume').name('Create new Volume');
