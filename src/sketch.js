const WIDTH = 800;
const HEIGHT = WIDTH;

let heightmap;
let mainShader;

function preload() {
    heightmap = loadImage("res/heightmap.png");
    mainShader = loadShader("shader/island.vert", "shader/island.frag");

}

function setup() {
    createCanvas(WIDTH, HEIGHT, WEBGL);
}

function rgbToShaderColor(r, g, b) {
    return [r / 255, g / 255, b / 255, 1.0]
}

function draw() {
    let mousePos = [mouseX / WIDTH, 1.0 - mouseY / WIDTH];

    mainShader.setUniform("uHeightmap", heightmap);
    mainShader.setUniform("uMouse", mousePos);
    mainShader.setUniform("uColWater", rgbToShaderColor(40, 157, 166))
    mainShader.setUniform("uColSand", rgbToShaderColor(196, 199, 109))
    mainShader.setUniform("uColGrass1", rgbToShaderColor(147, 199, 109))
    mainShader.setUniform("uColGrass2", rgbToShaderColor(52, 97, 45))
    mainShader.setUniform("uColMountain", rgbToShaderColor(110, 112, 103))
    mainShader.setUniform("uColSnow", rgbToShaderColor(207, 224, 227))


    shader(mainShader);
    rect(0, 0, WIDTH, HEIGHT);
}
