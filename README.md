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

```bash
todo
```

## Usage

```ts
import Shape3D from 'three-shape-3d';
const shape = new Shape3D();
scene.add(shape);
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

## Example

See the [example](./example) folder for an example.
Or, view the live demo here:

[https://andrewisen-tikab.github.io/three-shape-3d/example/](https://andrewisen-tikab.github.io/three-shape-3d/example/)

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

```

```
