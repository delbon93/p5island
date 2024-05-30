precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uHeightmap;
uniform sampler2D uWavemap;
uniform sampler2D uTerrainGrain;
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

#define USE_SOFT_SHADOWS
//#define USE_GAUSSIAN_BLUR

#define LEVEL_COLOR(h, level, color) if (h < level) { gl_FragColor = color; }
#define HIGHEST_LEVEL(color) gl_FragColor = color;

#define BLUR_KERNEL_OFFSET 0.0025
#define BLUR_COMP(uv, xoff, yoff, weight) (weight * light(vec2(uv.x + xoff * BLUR_KERNEL_OFFSET, uv.y + yoff * BLUR_KERNEL_OFFSET)))

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
    const float SHADOW = 0.65;
    const float WEAK_SHADOW = 0.85;

    const float MAX_PATH_LENGTH_FOR_WEAK_SHADOW = 0.3;

    vec3 origin = vec3(p.x, p.y, height(p) + 0.01);
    vec3 curr = origin;

    vec3 traceDir = -normalize(uSunDir);

    const float _ceiling = 1.1;
    const float minStep = 0.0002;
    const int maxStepCount = 500;

    for (int i = 0; i < maxStepCount; i++) {
        float currHeight = height(curr.xy);

        if (curr.z < currHeight) {
            #ifdef USE_SOFT_SHADOWS
            float pathLength = length(origin - curr);
            float t = clamp(pathLength / MAX_PATH_LENGTH_FOR_WEAK_SHADOW, 0.0, 1.0);
            return mix(SHADOW, WEAK_SHADOW, t);
            #else
            return SHADOW;
            #endif
        }

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

vec4 lightModulate(vec4 l, vec3 lightDir) {
    vec3 xyFlattened = normalize(vec3(lightDir.xy, 0.0));
    float lightFlatness = abs(dot(xyFlattened, lightDir));
    lightFlatness = smoothstep(0.7, 1.3, lightFlatness);
    l.r = mix(l.r, max(l.r, 0.7), lightFlatness);
    return l;
}

void main() {
    vec2 uv = vTexCoord;

    float h = height(vTexCoord);

    float biomeH = h + texture2D(uTerrainGrain, uv).x * 0.1;

    // mind the inverse order
    HIGHEST_LEVEL(uColSnow)
    LEVEL_COLOR(biomeH, _mountainlevel, uColMountain)
    LEVEL_COLOR(biomeH, _grasslevel2, uColGrass2)
    LEVEL_COLOR(biomeH, _grasslevel1, uColGrass1)
    LEVEL_COLOR(biomeH, _sandlevel, uColSand)
    LEVEL_COLOR(biomeH, _waterlevel, uColWater)

    if (h < _waterlevel) {
        vec4 waterCol = water(uv);
        float subsurfaceness = h / (2.2 *_waterlevel);
        vec4 blueTint = vec4(waterCol.xyz, 0.0) * 0.33;
        gl_FragColor = mix(waterCol, uColSand + blueTint, subsurfaceness);
    }


    float totalLight = 0.0;    

    #ifdef USE_GAUSSIAN_BLUR
    totalLight += BLUR_COMP(uv, -1.0, -1.0, 1.0 / 16.0);
    totalLight += BLUR_COMP(uv,  0.0, -1.0, 1.0 /  8.0);
    totalLight += BLUR_COMP(uv,  1.0, -1.0, 1.0 / 16.0);
    totalLight += BLUR_COMP(uv, -1.0,  0.0, 1.0 /  8.0);
    totalLight += BLUR_COMP(uv,  0.0,  0.0, 1.0 /  4.0);
    totalLight += BLUR_COMP(uv,  1.0,  0.0, 1.0 /  8.0);
    totalLight += BLUR_COMP(uv, -1.0,  1.0, 1.0 / 16.0);
    totalLight += BLUR_COMP(uv,  0.0,  1.0, 1.0 /  8.0);
    totalLight += BLUR_COMP(uv,  1.0,  1.0, 1.0 / 16.0);
    #else
    totalLight = light(uv);
    #endif
    
    gl_FragColor = lightModulate(gl_FragColor, normalize(uSunDir)) * totalLight;
}