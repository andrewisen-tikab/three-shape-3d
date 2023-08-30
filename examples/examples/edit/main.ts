import Example, { SUPPORTED_SHAPES, SupportedShapes } from '../../src/Example';

const example = new Example();
example.initAsync();
example.createScene();
example.addDummyShape(true);

const { gui, params, factory, selector } = example;
const configFolder = gui.addFolder('Config');
const lineFolder = gui.addFolder('Line').open();
const areaFolder = gui.addFolder('Area').close();
const volumeFolder = gui.addFolder('Volumes').close();

lineFolder.add(params, 'closeLine').onChange((value: boolean) => {
    const { shape3d } = example;
    if (shape3d == null) return;
    shape3d.setCloseLine(value);
});

configFolder
    .add(params, 'shape', Object.values(SUPPORTED_SHAPES))
    .onChange((shapeType: SupportedShapes) => {
        const shape3D = selector.getSelectedShape();
        if (shape3D == null) return;

        factory.update(shape3D, { shapeType });

        params.shape = shapeType as any;

        lineFolder.close();
        areaFolder.close();
        volumeFolder.close();
        switch (shapeType) {
            case SUPPORTED_SHAPES.LINE:
                lineFolder.open();
                break;
            case SUPPORTED_SHAPES.AREA:
                areaFolder.open();
                break;
            case SUPPORTED_SHAPES.VOLUME:
                volumeFolder.open();
                break;
            default:
                break;
        }
    });
