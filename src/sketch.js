const WIDTH = 800;
const HEIGHT = WIDTH;
const FPS = 75;

let heightmaps = [];
let heightmapIndex = 2;
let wavemap;
let terrainGrain;
let clouds;

let mainShader;

let shadowsEnabled = 1.0;
let wavesEnabled = 1.0;
let cloudsEnabled = 1.0;
let edgeFalloffEnabled = 1.0;
let falloffExponent = 0.0;

let frozenMousePos = null;

let sunDirection;

function preload() {
    heightmaps.push(loadImage("res/heightmap3.png"));
    heightmaps.push(loadImage("res/heightmap.png"));
    heightmaps.push(loadImage("res/heightmap2.png"));
    heightmaps.push(loadImage("res/heightmap4.png"));
    heightmaps.push(loadImage("res/heightmap5.png"));
    heightmaps.push(loadImage("res/heightmap6.png"));
    heightmaps.push(loadImage("res/heightmap7.png"));
    heightmaps.push(loadImage("res/heightmap8.png"));
    heightmaps.push(loadImage("res/heightmap9.png"));
    wavemap = loadImage("res/waves.png");
    terrainGrain = loadImage("res/grain.png");
    clouds = loadImage("res/clouds.png");
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
    if (key === 'z') {
        shadowsEnabled = 0;
        wavesEnabled = 0;
        cloudsEnabled = 0;
        edgeFalloffEnabled = 0;
        colorsEnabled = 0;
    }

    if (key === 'h')
        heightmapIndex = (heightmapIndex + 1) % heightmaps.length;
    if (key === 's')
        shadowsEnabled = 1 - shadowsEnabled;
    if (key === 'w')
        wavesEnabled = 1 - wavesEnabled;
    if (key === 'c')
        cloudsEnabled = 1 - cloudsEnabled;
    if (key === 'f')
        edgeFalloffEnabled = 1 - edgeFalloffEnabled;
    if (key === 'm') {
        if (frozenMousePos === null)
            frozenMousePos = [mouseX, mouseY];
        else
            frozenMousePos = null;
    }
    if (key === 'o')
        colorsEnabled = 1 - colorsEnabled;
}
    
function draw() {
    if (keyIsDown(UP_ARROW))
        falloffExponent += 1.5 / FPS;
    if (keyIsDown(DOWN_ARROW))
        falloffExponent -= 1.5 / FPS;


    let mX = mouseX;
    let mY = mouseY;

    if (frozenMousePos !== null) {
        mX = frozenMousePos[0];
        mY = frozenMousePos[1];
    }

    let mousePos = [mX / WIDTH, 1.0 - mY / HEIGHT];

    mainShader.setUniform("uHeightmap", heightmaps[heightmapIndex]);
    mainShader.setUniform("uTerrainGrain", terrainGrain);
    mainShader.setUniform("uWavemap", wavemap);
    mainShader.setUniform("uClouds", clouds);

    mainShader.setUniform("uFalloffExponent", falloffExponent);

    mainShader.setUniform("uMouse", mousePos);

    mainShader.setUniform("uColWater", rgbToShaderColor(40, 157, 166));
    mainShader.setUniform("uColSand", rgbToShaderColor(196, 199, 109));
    mainShader.setUniform("uColGrass1", rgbToShaderColor(120, 199, 90));
    mainShader.setUniform("uColGrass2", rgbToShaderColor(52, 97, 45));
    mainShader.setUniform("uColMountain", rgbToShaderColor(110, 112, 103));
    mainShader.setUniform("uColSnow", rgbToShaderColor(207, 224, 227));

    mainShader.setUniform("uSunDir", [WIDTH / 2 - mX, mY - HEIGHT / 2, -100]);

    mainShader.setUniform("uTime", millis() / 1000);
    mainShader.setUniform("uShadowsEnabled", shadowsEnabled);
    mainShader.setUniform("uWavesEnabled", wavesEnabled);
    mainShader.setUniform("uCloudsEnabled", cloudsEnabled);
    mainShader.setUniform("uEdgeFalloffEnabled", edgeFalloffEnabled);
    mainShader.setUniform("uColorsEnabled", colorsEnabled);

    shader(mainShader);
    rect(0, 0, WIDTH, HEIGHT);
}
