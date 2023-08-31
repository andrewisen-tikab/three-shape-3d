# three-shape-3d

A generic geometric shape object (line, area, volume) for three.js

It's an all-in-one solution for creating and manipulating geometric shapes in three.js.

It's a wrapper around three.js geometry and mesh objects, and provides a simple API for creating and manipulating shapes.

You can create a shape from a set of points and build either a:

-   line
-   area
-   volume

<img src="https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/example.gif?raw=true" width="100%" />

## Installation

Install with npm:

```bash
npm install three-shape-3d
```

Install with yarn:

```bash
yarn add three-shape-3d
```

## Usage

```ts
import { Shape3D } from 'three-shape-3d';
const shape = new Shape3D();
scene.add(shape);
```

This will create an empty shape.
To make anything useful, you need to add points to the shape.

```ts
import { Shape3DFactory } from 'three-shape-3d';

// The factory can help you create shapes
const factory = new Shape3DFactory();

// Array of points
const points: THREE.Vector3[] = [];

// Arbitrary points
points.push(new THREE.Vector3(0, 0, 0));
points.push(new THREE.Vector3(20, 0, 0));
points.push(new THREE.Vector3(0, 0, 20));

// Use the factory to create a shape
const shape3d = factory.create({
    shapeType: 'line',
});
shape3d.setFromPoints(points);
```

Now, if you want to update the shape, you can do so by calling the factory.

```ts
// Convert the line shape to a volume shape.
factory.update(shape3D, {
    shapeType: SUPPORTED_SHAPES.VOLUME, // New shape type
    volumeHeight: 10,
});
```

### Line

TODO

### Area

TODO

### Volume

TODO

### Labels

TODO

<img src="https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/labels.gif?raw=true" width="100%" />

### Angles

TODO

<img src="https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/angles.gif?raw=true" width="100%" />

## Example

See the [examples](./examples) folder for an example.
Or, view the live demo here:

-   [https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/create/](https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/create/)
-   [https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/edit/](https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/edit/)
-   [https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/memory/](https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/memory/)
-   [https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/objects/](https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/objects/)
-   [https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/csg/](https://andrewisen-tikab.github.io/three-shape-3d/examples/examples/csg/)

<img src="https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/example.gif?raw=true" width="100%" />

## Docs

Auto-generated docs can be found here:

[https://andrewisen-tikab.github.io/three-shape-3d/docs/](https://andrewisen-tikab.github.io/three-shape-3d/docs/)

## Status

This is a work in progress. It's not ready for production use.

## Design

The design is based on the following:

![Design](https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/definition-01.png?raw=true 'Design')

A line is defined by a set of 3-dimensional vertices. The point between two vertices is called `midpoint`.

![Design](https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/definition-02.png?raw=true 'Design')

The first vertex is called the `startpoint` and the last is called the `endpoint`.

![Design](https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/definition-03.png?raw=true 'Design')

A line can be closed by setting `closeLine` to `true`.

![Design](https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/definition-04.png?raw=true 'Design')

An area is a line with three or more vertices.

![Design](https://github.com/andrewisen-tikab/three-shape-3d/blob/feature/resources/definition-05.png?raw=true 'Design')

A volume is an area with a positive height.

## Is this library for you?

As stated by the design, this library is for you if you want to create and manipulate geometric shapes in three.js.
There are some limitations to what shapes you can create. Any complex shapes are very hard to work with.

## Assets

["Simple Metal Fence" by Blender3D](https://sketchfab.com/3d-models/simple-metal-fence-9450c03e6c074982b9f86cd73866b461)

["Wooden barricade" by BlackMike](https://sketchfab.com/3d-models/wooden-barricade-4de45fef6da2497c828ef76d195e9f7f)

["New York Scaffolding" by s4shko](https://sketchfab.com/3d-models/new-york-scaffolding-a73967fe00f6418d838f8b57e69e7b43)

````

```

```

```

```

```

```
````
