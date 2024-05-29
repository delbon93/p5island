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
const float _mountainlevel = 0.55;

#define LEVEL_COLOR(h, level, color) if (h < level) { gl_FragColor = color; }
#define HIGHEST_LEVEL(color) gl_FragColor = color;

float sig(float t) {
    return 1.0 / (1.0 + exp(-6.0 * (t - 0.5)));
}

float falloffByDistance(float d) {
    d = clamp(d, 0.0, 1.5);
    return clamp(1.0 - sig(d / 0.5), 0.05, 1.0);
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
    HIGHEST_LEVEL(uColSnow)
    LEVEL_COLOR(h, _mountainlevel, uColMountain)
    LEVEL_COLOR(h, _grasslevel2, uColGrass2)
    LEVEL_COLOR(h, _grasslevel1, uColGrass1)
    LEVEL_COLOR(h, _sandlevel, uColSand)
    LEVEL_COLOR(h, _waterlevel, uColWater)

    if (h < _waterlevel) {
        float subsurfaceness = h / _waterlevel;
        vec4 blueTint = vec4(uColWater.xyz, 0.0) * 0.33;
        gl_FragColor = mix(uColWater, uColSand + blueTint, subsurfaceness / 3.0);
    }
}