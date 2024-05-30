const WIDTH = 800;
const HEIGHT = WIDTH;

let heightmaps = [];
let heightmapIndex = 0;
let wavemap;
let mainShader;

let sunDirection;

function preload() {
    heightmaps.push(loadImage("res/heightmap3.png"));
    heightmaps.push(loadImage("res/heightmap.png"));
    heightmaps.push(loadImage("res/heightmap2.png"));
    wavemap = loadImage("res/waves.png");
    mainShader = loadShader("shader/island.vert", "shader/island.frag");
}

function setup() {
    createCanvas(WIDTH, HEIGHT, WEBGL);

    sunDirection = p5.Vector.normalize(createVector(1, 3, 5));
}

function rgbToShaderColor(r, g, b) {
    return [r / 255, g / 255, b / 255, 1.0];
}

function keyTyped() {
    if (key === 'h')
        heightmapIndex = (heightmapIndex + 1) % heightmaps.length;
}

function draw() {
    let mousePos = [mouseX / WIDTH, 1.0 - mouseY / HEIGHT];

    mainShader.setUniform("uHeightmap", heightmaps[heightmapIndex]);
    mainShader.setUniform("uWavemap", wavemap);
    mainShader.setUniform("uMouse", mousePos);

    mainShader.setUniform("uColWater", rgbToShaderColor(40, 157, 166));
    mainShader.setUniform("uColSand", rgbToShaderColor(196, 199, 109));
    mainShader.setUniform("uColGrass1", rgbToShaderColor(120, 199, 90));
    mainShader.setUniform("uColGrass2", rgbToShaderColor(52, 97, 45));
    mainShader.setUniform("uColMountain", rgbToShaderColor(110, 112, 103));
    mainShader.setUniform("uColSnow", rgbToShaderColor(207, 224, 227));

    mainShader.setUniform("uSunDir", [WIDTH / 2 - mouseX, mouseY - HEIGHT / 2, -100]);

    mainShader.setUniform("uTime", millis() / 1000);

    shader(mainShader);
    rect(0, 0, WIDTH, HEIGHT);
}
