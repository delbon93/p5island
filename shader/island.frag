precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uHeightmap;
uniform sampler2D uWavemap;
uniform vec2 uMouse;

uniform vec4 uColWater;
uniform vec4 uColSand;
uniform vec4 uColGrass1;
uniform vec4 uColGrass2;
uniform vec4 uColMountain;
uniform vec4 uColSnow;

uniform vec3 uSunDir;

uniform float uTime;


const float _waterlevel = 0.07195;
const float _sandlevel = 0.17;
const float _grasslevel1 = 0.26;
const float _grasslevel2 = 0.42;
const float _mountainlevel = 0.55;

#define LEVEL_COLOR(h, level, color) if (h < level) { gl_FragColor = color; }
#define HIGHEST_LEVEL(color) gl_FragColor = color;

vec2 uvWrap(vec2 uv) {
    return vec2(fract(uv.x), fract(uv.y));
}

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

vec4 water(vec2 p) {
    const float wavespeed = 0.01;
    vec2 sampleP = uvWrap(p + vec2(wavespeed, wavespeed * 2.0) * uTime);
    float w1 = texture2D(uWavemap, sampleP).x;
    w1 = mix(0.9, 1.0, w1);

    sampleP = uvWrap(p.yx + vec2(-wavespeed * 1.5, wavespeed) * uTime);
    float w2 = texture2D(uWavemap, sampleP).x;
    w2 = mix(0.9, 1.0, w2);

    float w = min(w1, w2);

    return uColWater * w;
}

float light(vec2 p) {
    const float FULL_LIGHT = 1.0;
    const float SHADOW = 0.5;

    vec3 curr = vec3(p.x, p.y, height(p) + 0.01);

    vec3 traceDir = -normalize(uSunDir);

    const float _ceiling = 1.1;
    const float minStep = 0.0002;
    const int maxStepCount = 500;

    for (int i = 0; i < maxStepCount; i++) {
        float currHeight = height(curr.xy);

        if (curr.z < currHeight)
            return SHADOW;

        if (curr.z >= _ceiling)
            return FULL_LIGHT;

        if (curr.x < 0.0 || curr.x > 1.0 || curr.y < 0.0 || curr.y > 1.0)
            return FULL_LIGHT;

        float deltaHeight = abs(currHeight - curr.z);
        float step = max(minStep, deltaHeight / 3.0);

        curr = curr + traceDir * step;
    }

    return FULL_LIGHT;
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
        vec4 waterCol = water(uv);
        float subsurfaceness = h / (2.2 *_waterlevel);
        vec4 blueTint = vec4(waterCol.xyz, 0.0) * 0.33;
        gl_FragColor = mix(waterCol, uColSand + blueTint, subsurfaceness);
    }

    gl_FragColor = gl_FragColor * light(uv);
}