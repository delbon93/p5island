precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uHeightmap;
uniform vec2 uMouse;

uniform vec4 uColWater;
uniform vec4 uColSand;
uniform vec4 uColGrass1;
uniform vec4 uColGrass2;
uniform vec4 uColMountain;
uniform vec4 uColSnow;


const float _waterlevel = 0.07195;
const float _sandlevel = 0.17;
const float _grasslevel1 = 0.21;
const float _grasslevel2 = 0.32;
const float _mountainlevel = 0.45;
const float _snowlevel = 0.65;

#define LEVEL_COLOR(h, level, color) if (h < level) { gl_FragColor = color; }

float falloffByDistance(float d) {
    return max(0.0,  1.0 - sqrt(d / 0.5));
}

float falloff(vec2 p) {
    const vec2 center = vec2(0.5);

    float dx = center.x - p.x;
    float dy = center.y - p.y;
    float d = sqrt(dx * dx + dy * dy);

    return falloffByDistance(d);
}

float height(vec2 p) {
    float h = texture2D(uHeightmap, p).x;

    h *= falloff(p);

    return h;
}

void main() {
    vec2 uv = vTexCoord;

    float h = height(vTexCoord);

    // mind the inverse order
    LEVEL_COLOR(h, _snowlevel, uColSnow)
    LEVEL_COLOR(h, _mountainlevel, uColMountain)
    LEVEL_COLOR(h, _grasslevel2, uColGrass2)
    LEVEL_COLOR(h, _grasslevel1, uColGrass1)
    LEVEL_COLOR(h, _sandlevel, uColSand)
    LEVEL_COLOR(h, _waterlevel, uColWater)
}