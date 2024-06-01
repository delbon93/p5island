precision mediump float;

varying vec2 vTexCoord;

uniform sampler2D uHeightmap;
uniform sampler2D uWavemap;
uniform sampler2D uTerrainGrain;
uniform sampler2D uClouds;

uniform float uFalloffExponent;

uniform vec2 uMouse;

uniform vec4 uColWater;
uniform vec4 uColSand;
uniform vec4 uColGrass1;
uniform vec4 uColGrass2;
uniform vec4 uColMountain;
uniform vec4 uColSnow;

uniform vec3 uSunDir;

uniform float uTime;

uniform float uShadowsEnabled;
uniform float uWavesEnabled;
uniform float uCloudsEnabled;
uniform float uEdgeFalloffEnabled;
uniform float uColorsEnabled;

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

#define WHITE vec4(1.0)

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
    if (uEdgeFalloffEnabled < 0.5)
        return 1.0;
    
    const vec2 center = vec2(0.5);

    float dx = center.x - p.x;
    float dy = center.y - p.y;
    float d = sqrt(dx * dx + dy * dy);

    return clamp(exp(uFalloffExponent) * falloffByDistance(d), 0.0, 1.0);
}

float height(vec2 p) {
    float h = texture2D(uHeightmap, p).x;

    h *= falloff(p);

    return h;
}

vec3 normal(vec2 p) {
    const float NORMAL_SAMPLE_DELTA = 0.005;
    vec2 sx1 = vec2(p.x - NORMAL_SAMPLE_DELTA, p.y);
    vec2 sx2 = vec2(p.x + NORMAL_SAMPLE_DELTA, p.y);
    vec2 sy1 = vec2(p.x, p.y - NORMAL_SAMPLE_DELTA);
    vec2 sy2 = vec2(p.x, p.y + NORMAL_SAMPLE_DELTA);
    vec3 px1 = vec3(sx1, height(sx1));
    vec3 px2 = vec3(sx2, height(sx2));
    vec3 py1 = vec3(sy1, height(sy1));
    vec3 py2 = vec3(sy2, height(sy2));
    
    return normalize(cross(px2 - px1, py2 - py1));
}

vec4 water(vec2 p) {
    if (uWavesEnabled < 0.5)
        return uColWater;

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

float clouds(vec2 uv) {
    if (uCloudsEnabled < 0.5)
        return 0.0;

    const vec2 moveDir = vec2(1.0, 2.0) * 0.02;

    const float noiseScale = 0.15;

    vec2 sampleP = (uv + moveDir * uTime) * noiseScale;
    vec2 p = uvWrap(sampleP);
    float cloud1 = texture2D(uClouds, p).x;

    sampleP = (uv + moveDir * uTime + vec2(2.4, -1.0)) * noiseScale;
    p = uvWrap(sampleP);
    float cloud2 = texture2D(uClouds, p).x;

    float mixFactor =  2.0 * sin(uTime * 0.05) * cos(uTime * 0.15) + 1.0;
    float cloud = mix(cloud1, cloud2, mixFactor);

    cloud *= 1.2;

    return cloud * cloud;
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

float normalLight(vec2 p) {
    const float FULL_LIGHT = 1.0;
    const float SHADOW = 0.9;

    vec3 n = normal(p);

    float lightness = dot(-normalize(uSunDir), n);

    return mix(SHADOW, FULL_LIGHT, lightness);
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

    float h = height(uv);

    float biomeH = h + texture2D(uTerrainGrain, uv).x * 0.1;

    if (uColorsEnabled > 0.5) {
    // mind the inverse order
        HIGHEST_LEVEL(uColSnow)
        LEVEL_COLOR(biomeH, _mountainlevel, uColMountain)
        LEVEL_COLOR(biomeH, _grasslevel2, uColGrass2)
        LEVEL_COLOR(biomeH, _grasslevel1, uColGrass1)
        LEVEL_COLOR(biomeH, _sandlevel, uColSand)
        LEVEL_COLOR(biomeH, _waterlevel, uColWater)

        
        if (h < _waterlevel) {
            // normLight = 0.0;
            vec4 waterCol = water(uv);
            float subsurfaceness = h / (2.2 *_waterlevel);
            vec4 blueTint = vec4(waterCol.xyz, 0.0) * 0.33;
            gl_FragColor = mix(waterCol, uColSand + blueTint, subsurfaceness);
        }
    }
    else
        gl_FragColor = vec4(h, h, h, 1.0);

    float normLight = normalLight(uv);

    float sunLight = 0.0;    

    #ifdef USE_GAUSSIAN_BLUR
    sunLight += BLUR_COMP(uv, -1.0, -1.0, 1.0 / 16.0);
    sunLight += BLUR_COMP(uv,  0.0, -1.0, 1.0 /  8.0);
    sunLight += BLUR_COMP(uv,  1.0, -1.0, 1.0 / 16.0);
    sunLight += BLUR_COMP(uv, -1.0,  0.0, 1.0 /  8.0);
    sunLight += BLUR_COMP(uv,  0.0,  0.0, 1.0 /  4.0);
    sunLight += BLUR_COMP(uv,  1.0,  0.0, 1.0 /  8.0);
    sunLight += BLUR_COMP(uv, -1.0,  1.0, 1.0 / 16.0);
    sunLight += BLUR_COMP(uv,  0.0,  1.0, 1.0 /  8.0);
    sunLight += BLUR_COMP(uv,  1.0,  1.0, 1.0 / 16.0);
    #else
    sunLight = light(uv);
    #endif


    // float totalLight = max(normLight, sunLight);
    float totalLight = sqrt(normLight) * sqrt(sunLight);
    //float totalLight = sunLight;

    if (h < _waterlevel) {
        float diff = abs(h - _waterlevel);
        totalLight = clamp(totalLight += diff * 3.0 ,0.0, 1.0);
    }

    if (uShadowsEnabled > 0.5)
        gl_FragColor = lightModulate(gl_FragColor, normalize(uSunDir)) * totalLight;

    float cloud = clouds(uv);
    gl_FragColor = mix(gl_FragColor, WHITE, cloud);
}