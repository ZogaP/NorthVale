export const materialVertex=`#version 300 es
precision highp float;
out vec2 vUv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.0-1.0,0.0,1.0);}`;

export const materialFragment=`#version 300 es
precision highp float;
in vec2 vUv;
out vec4 fragColor;
uniform sampler2D uBase;
uniform sampler2D uNormal;
uniform sampler2D uSpecular;
uniform sampler2D uAO;
uniform vec2 uTexel;
uniform vec3 uAmbient;
uniform vec3 uLightPosition[4];
uniform vec3 uLightColor[4];
uniform float uLightRadius[4];
uniform int uLightCount;
uniform float uRoughness;
uniform float uOutline;
uniform int uUnlit;
vec3 linearize(vec3 c){return pow(c,vec3(2.2));}
void main(){
 vec4 base=texture(uBase,vUv);
 float edge=0.0;
 for(int y=-2;y<=2;y++)for(int x=-2;x<=2;x++){
  vec2 uv=vUv+vec2(float(x),float(y))*uTexel*uOutline;
  if(all(greaterThanEqual(uv,vec2(0)))&&all(lessThanEqual(uv,vec2(1))))edge=max(edge,texture(uBase,uv).a);
 }
 float border=max(0.0,edge-base.a)*step(0.01,uOutline);
 vec3 N=normalize(texture(uNormal,vUv).xyz*2.0-1.0);
 float ao=texture(uAO,vUv).r;
 float specular=texture(uSpecular,vUv).r;
 vec3 albedo=linearize(base.rgb),color=albedo*uAmbient*ao;
 // OpenGL tangent normal (+Y up); map UV to a face-sized tangent plane.
 vec3 position=vec3(vUv-0.5,0.0),V=vec3(0.0,0.0,1.0);
 for(int i=0;i<4;i++){
  if(i>=uLightCount)break;
  vec3 delta=uLightPosition[i]-position;
  float distanceToLight=length(delta);
  vec3 L=normalize(delta),H=normalize(L+V);
  float attenuation=pow(max(0.0,1.0-distanceToLight/uLightRadius[i]),2.0);
  float diffuse=max(dot(N,L),0.0);
  float exponent=mix(96.0,8.0,uRoughness);
  float reflection=pow(max(dot(N,H),0.0),exponent)*specular;
  color+=(albedo*diffuse+vec3(reflection))*uLightColor[i]*attenuation;
 }
 vec3 encoded=pow(max(color,vec3(0.0)),vec3(1.0/2.2));
 if(uUnlit==1)encoded=base.rgb;
 float alpha=max(base.a,border);
 vec3 rgb=mix(encoded,vec3(1.0,0.78,0.32),border/max(alpha,0.001));
 fragColor=vec4(rgb,alpha);
}`;
