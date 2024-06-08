# SVGPathToCanvas2D

Converts SVG paths into a simplified list of commands that can be directly consumed by the canvas 2D API.

This is similar to [path2canvas](https://github.com/woaiyan/path2canvas), and some parts based on it (namely the arc transform code), but not directly tied to canvas2d and written in my own style.

This also includes some test cases borrowed from the SVG spec. [Look here](https://urraka.github.io/SVGPathToCanvas2D/test/) to see a comparison between SVG rendered paths and the canvas equivalent.

This conversion code doesn't perform any error checking whatsoever. The input SVG path is assumed to be a valid one.

## Output commands:

```js
[
    // moveTo
    { cmd: "M", args: [x, y] },

    // lineTo
    { cmd: "L", args: [x, y] },

    // bezierCurveTo
    { cmd: "C", args: [cp1x, cp1y, cp2x, cp2y, x, y] },

    // quadraticCurveTo
    { cmd: "Q", args: [cpx, cpy, x, y] },

    // ellipse
    { cmd: "A", args: [cx, cy, rx, ry, rotation, startAngle, endAngle, ccw] },

    // closePath
    { cmd: "Z", args: [] },
]
```

## Sample usage:

```js
import { SVGPathToCanvas2D } from "./SVGPathToCanvas2D.js";

// initialize canvas context
const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

// convert svg path into commands
const d = "M240 296q25-100 47 0t47 0t47 0t47 0t47 0z";
const commands = SVGPathToCanvas2D(d);

// draw
ctx.strokeStyle = "#000";
ctx.beginPath();
for (const { cmd, args } of commands) {
    switch (cmd) {
        case "M": ctx.moveTo(...args); break;
        case "L": ctx.lineTo(...args); break;
        case "C": ctx.bezierCurveTo(...args); break;
        case "Q": ctx.quadraticCurveTo(...args); break;
        case "A": ctx.ellipse(...args); break;
        case "Z": ctx.closePath(); ctx.stroke(); ctx.beginPath(); break;
    }
}
ctx.stroke();
```
