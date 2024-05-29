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

function draw() {
    shader(mainShader);
    rect(0, 0, WIDTH, HEIGHT);
}
