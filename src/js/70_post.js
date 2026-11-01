/* ============================================================
   70 · POST — WebGL finishing pass (bloom, chromatic aberration,
        grade, split-tone, vignette, scanlines, VHS warp, glitch,
        grain, letterbox). Falls back to a 2D copy when WebGL fails.
   ============================================================ */
const POST={ok:false,gl:null,mip:false,u:{},c2d:null,tex:null};
const VS='attribute vec2 p;varying vec2 v;void main(){v=p*0.5+0.5;gl_Position=vec4(p,0.0,1.0);}';
const FS=`precision mediump float;varying vec2 v;uniform sampler2D tx;uniform vec2 res;
uniform float time,ca,bloom,grain,vig,scan,warp,sat,con,glitch,lbox,mip;uniform vec3 tint,shd,hil;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec2 uv=v;
 if(warp>0.0){float row=floor(uv.y*90.0);uv.x+=warp*0.0022*sin(uv.y*38.0+time*2.7)+warp*0.012*(h(vec2(row,floor(time*14.0)))-0.5)*step(0.975,h(vec2(floor(time*7.0),floor(uv.y*24.0))));}
 if(glitch>0.0){float row=floor(uv.y*26.0);float r=h(vec2(row,floor(time*30.0)));if(r<glitch*0.4)uv.x+=(h(vec2(row*3.1,floor(time*30.0)))-0.5)*0.14*glitch;}
 vec2 d=uv-0.5;vec2 o=d*ca*0.014+vec2(glitch*0.006,0.0);
 vec3 c=vec3(texture2D(tx,uv+o).r,texture2D(tx,uv).g,texture2D(tx,uv-o).b);
 if(bloom>0.0&&mip>0.5){vec3 b=texture2D(tx,uv,3.0).rgb*0.45+texture2D(tx,uv,4.5).rgb*0.35+texture2D(tx,uv,6.0).rgb*0.2;b=max(b-0.42,0.0)*1.9;c+=b*bloom;}
 float l=dot(c,vec3(0.299,0.587,0.114));c=mix(vec3(l),c,sat);c=(c-0.5)*con+0.5;c*=tint;c+=shd*(1.0-l)*0.6+hil*l*0.5;
 float asp=res.x/res.y;float vg=1.0-vig*smoothstep(0.32,0.98,length(d*vec2(min(asp,1.6),1.0)*0.95));c*=vg;
 if(scan>0.0)c*=1.0-scan*0.45*(0.5+0.5*sin(uv.y*res.y*1.5708));
 c+=(h(uv*res+fract(time*7.31)*91.0)-0.5)*grain*0.38;
 if(lbox>0.0&&(uv.y<lbox||uv.y>1.0-lbox))c=vec3(0.0);
 gl_FragColor=vec4(clamp(c,0.0,1.0),1.0);}`;
function initPost(){
  const opts={alpha:false,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:true};
  let gl=null,v2=false;
  try{gl=cv.getContext('webgl2',opts);v2=!!gl;if(!gl)gl=cv.getContext('webgl',opts)||cv.getContext('experimental-webgl',opts)}catch(e){gl=null}
  if(gl){try{
    const sh=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
    const pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error('link');
    gl.useProgram(pr);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
    const tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,v2?gl.LINEAR_MIPMAP_LINEAR:gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
    ['tx','res','time','ca','bloom','grain','vig','scan','warp','sat','con','glitch','lbox','mip','tint','shd','hil'].forEach(n=>POST.u[n]=gl.getUniformLocation(pr,n));
    gl.uniform1i(POST.u.tx,0);Object.assign(POST,{ok:true,gl,mip:v2,tex});postResize();return
  }catch(e){console.warn('post fx off:',e&&e.message)}}
  // fallback: fresh 2D canvas
  const n=document.createElement('canvas');n.id='cv';n.width=W;n.height=H;cv.replaceWith(n);cv=n;POST.ok=false;POST.c2d=cv.getContext('2d');fitCanvas();
}
function postResize(){if(POST.ok)POST.gl.viewport(0,0,W,H)}
function present(t,pal){
  const fx=DIR.fx,I=INTENSITY;
  if(POST.ok){const gl=POST.gl,u=POST.u;
    try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,SRC);if(POST.mip&&fx.bloom>0)gl.generateMipmap(gl.TEXTURE_2D)}catch(e){POST.ok=false;return}
    gl.uniform2f(u.res,W,H);gl.uniform1f(u.time,t);
    gl.uniform1f(u.ca,(fx.ca*0.5+K*fx.caKick+FXU.flash*fx.caKick*0.8)*I);gl.uniform1f(u.bloom,fx.bloom*(1+K*0.35)*(pal.light?0.35:1));
    gl.uniform1f(u.grain,fx.grain);gl.uniform1f(u.vig,fx.vig*(pal.light?0.6:1));gl.uniform1f(u.scan,fx.scan);gl.uniform1f(u.warp,fx.warp);
    gl.uniform1f(u.sat,fx.sat);gl.uniform1f(u.con,fx.con);gl.uniform1f(u.glitch,clamp(FXU.glitch));gl.uniform1f(u.lbox,fx.lbox||0);gl.uniform1f(u.mip,POST.mip?1:0);
    gl.uniform3fv(u.tint,fx.tint);gl.uniform3fv(u.shd,fx.shadow);gl.uniform3fv(u.hil,fx.high);
    gl.drawArrays(gl.TRIANGLES,0,3);return}
  // 2D fallback: glitch, grain, vignette, letterbox drawn on the source then copied
  if(FXU.glitch>0.2)glitch2d(FXU.glitch);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  if(fx.vig>0){const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.7);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,`rgba(0,0,0,${fx.vig*0.7})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
  ctx.globalCompositeOperation=pal.light?'multiply':'overlay';ctx.globalAlpha=Math.max(0.05,fx.grain);const ox=Math.random()*256|0,oy=Math.random()*256|0;ctx.translate(-ox,-oy);ctx.fillStyle=GRAINS[(t*24|0)%3];ctx.fillRect(0,0,W+256,H+256);
  ctx.restore();
  if(fx.lbox){ctx.fillStyle='#000';ctx.fillRect(0,0,W,H*fx.lbox);ctx.fillRect(0,H*(1-fx.lbox),W,H*fx.lbox)}
  POST.c2d.drawImage(SRC,0,0);
}
