(()=>{"use strict";var t={996:(t,e)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.fullscreenCanvas=e.fullscreenCanvas3d=e.getCanvas=void 0,e.getCanvas=(t=!1)=>{const e=document.createElement("canvas");return e.width=window.innerWidth,e.height=window.innerHeight,t||(e.style.position="absolute",e.style.top="0",e.style.left="0"),e},e.fullscreenCanvas3d=(t=!1)=>{const n=(0,e.getCanvas)(t),s=n.getContext("webgl");if(null==s)throw new Error("failed to get 'webgl' context");return document.body.appendChild(n),s},e.fullscreenCanvas=function(t=!1,s=!1){const r=(0,e.getCanvas)(t),o=r.getContext("2d",{alpha:!s});if(null==o)throw new Error("failed to get '2d' context");return o.clear=function(){return o.clearRect(0,0,o.canvas.width,o.canvas.height),o},o.makePath=function(t){o.beginPath(),o.moveTo(t[0],t[1]);for(var e=2;e<t.length;e+=2)o.lineTo(t[e],t[e+1]);return o.closePath(),o},o.strokeCircle=function(t,e,n){return o.beginPath(),o.arc(t,e,n,0,2*Math.PI,!0),o.closePath(),o.stroke(),o},o.fillCircle=function(t,e,n){return o.beginPath(),o.arc(t,e,n,0,2*Math.PI,!0),o.closePath(),o.fill(),o},o.fillHex=function(t,e,s){o.beginPath(),o.save(),o.translate(t,e),o.moveTo(s/n,0);for(let t=0;t<5;++t)o.rotate(Math.PI/3),o.lineTo(s/n,0);return o.restore(),o.closePath(),o.fill(),o},document.body.style.overflow="hidden",document.body.appendChild(r),o};const n=Math.sqrt(3)/2},361:(t,e)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.Range=e.Rect=e.Point=void 0;class n{constructor(t,e){this.x=t,this.y=e}times(t,e){return"number"==typeof t?new n(this.x*t,this.y*e):new n(this.x*t.x,this.y*t.y)}plus(t,e){return"number"==typeof t?new n(this.x+t,this.y+e):new n(this.x+t.x,this.y+t.y)}}e.Point=n,e.Rect=class extends n{constructor(t,e,n,s){super(t,e),this.w=n,this.h=s}get horizontal(){return new s(this.x,this.w)}get vertical(){return new s(this.y,this.h)}};class s{constructor(t,e){this.start=t,this.length=e}get end(){return this.start+this.length}}e.Range=s},424:(t,e)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.Loop=void 0,e.Loop=class{constructor(t,e,n,s){this.fixedDelta=t,this.init=e,this.fixed=n,this.variable=s,this.isRunning=!1,this.fixedAccum=0}start(){if(this.isRunning)return;let t=this.init();this.isRunning=!0;let e=0;const n=s=>{const r=0==e,o=r?0:s-e;e=s,t=this.update(o,t,r),this.isRunning&&requestAnimationFrame(n)};requestAnimationFrame(n)}stop(){this.isRunning=!1}update(t,e,n=!1){let s=e;this.fixedAccum+=t;let r=!1;if(n)s=this.fixed(this.fixedDelta,s),r=!0;else for(;this.fixedAccum>this.fixedDelta;)this.fixedAccum-=this.fixedDelta,s=this.fixed(this.fixedDelta,s),r=!0;return r&&this.variable(t,s),s}}},716:(t,e)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.Random=void 0,e.Random=class{constructor(t=(new Date).getTime()){this.seed=t}next(){return this.seed=+("0."+Math.sin(this.seed).toString().substr(6))}inext(t,e){return t+(e-t)*this.next()|0}shuffle(t){for(var e,n,s=t.length;0!==s;)n=this.inext(0,s),e=t[s-=1],t[s]=t[n],t[n]=e;return t}}},450:(t,e,n)=>{Object.defineProperty(e,"__esModule",{value:!0}),e.SimplexNoiseOctave=e.SimplexNoise2d=void 0;const s=n(716),r=[1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1],o=.5*(Math.sqrt(3)-1),i=(3-Math.sqrt(3))/6;e.SimplexNoise2d=class{constructor(t,e,n=Date.now()){const r=new s.Random(n);this.octaves=new Array(e);for(let n=0;n<e;++n)this.octaves.push({octave:new a(r.inext(0,9007199254740991)),frequency:Math.pow(2,n),amplitude:Math.pow(t,n)})}getNoise2d(t,e){return this.octaves.reduce(((n,s)=>n+s.amplitude*s.octave.getNoise2d(t*s.frequency,e*s.frequency)),0)}};class a{constructor(t=0){this.perm=function(t,e){const n=new Array(256);for(let t=0;t<256;++t)n[t]=t;return new s.Random(e).shuffle(n),n}(0,t),this.perm12=this.perm.map((t=>t%12))}getNoise2d(t,e){const n=this.perm,s=this.perm12,a=(t+e)*o,h=t+a|0,c=e+a|0,u=(h+c)*i,d=t-(h-u),f=e-(c-u),[p,v]=d>f?[1,0]:[0,1],m=d-p+i,w=f-v+i,x=d-1+2*i,g=f-1+2*i,y=255&h,P=255&c,M=s[y+n[P]&255],b=s[y+p+n[P+v&255]&255],R=s[y+1+n[P+1&255]&255];let C,_,q,A=.5-d*d-f*f;A<0?C=0:(A*=A,C=A*A*l(r[3*M],r[3*M+1],d,f));let N=.5-m*m-w*w;N<0?_=0:(N*=N,_=N*N*l(r[3*b],r[3*b+1],m,w));let O=.5-x*x-g*g;return O<0?q=0:(O*=O,q=O*O*l(r[3*R],r[3*R+1],x,g)),70*(C+_+q)}}function l(t,e,n,s){return t*n+e*s}e.SimplexNoiseOctave=a},663:(t,e)=>{function n(t,e){return"number"==typeof e&&"number"==typeof t?Math.floor(t+Math.random()*(e-t)):"number"==typeof t?Math.floor(t*Math.random()):t instanceof Array?t[Math.floor(t.length*Math.random())]:Math.random()}Object.defineProperty(e,"__esModule",{value:!0}),e.shuffle=e.array=e.rnd=void 0,e.rnd=n,e.array=function(t,e,n){const s=[];for(let r=0;r<e;++r){const e=[];for(let s=0;s<t;++s)e.push(n(r,s));s.push(e)}return s},e.shuffle=function(t){for(let e=t.length-1;e>0;--e){const s=n(e+1);[t[e],t[s]]=[t[s],t[e]]}}}},e={};function n(s){var r=e[s];if(void 0!==r)return r.exports;var o=e[s]={exports:{}};return t[s](o,o.exports,n),o.exports}(()=>{const t=n(996),e=n(424),s=n(361),r=n(663),o=n(450),i=Math.sqrt(3)/2,a=2*Math.PI;class l extends s.Point{constructor(t,e){super(t,e),this.sample=0}}class h{constructor(t,e){this.pos=new s.Point(t,e),this.lastRenderedPos=this.pos}}function c(t,e,n){let s=t/n/i,r=e/n+(1-(0|s)%2)/2,o=[[Math.floor(r),Math.floor(s)]],a=s-(0|s)-.5,l=r-(0|r)-.5;r|=0,s|=0;let h=a<0,c=l<a*i/2,u=l<-a*i/2;return u&&c&&o.push([r-1,s]),u||c||o.push([r+1,s]),u&&h&&o.push([r-(s+1)%2,s-1]),u||h||o.push([r+s%2,s+1]),c&&!h&&o.push([r-(s+1)%2,s+1]),!c&&h&&o.push([r+s%2,s-1]),o}new e.Loop(1e3/60,(function(){const e=(0,t.fullscreenCanvas)(!1,!0),n=.05*e.canvas.width,a=new s.Rect(n,n,e.canvas.width-2*n,e.canvas.height-2*n);let c=25,u=Math.round(a.w/c/i);c=a.w/u/i;let d=Math.round(a.h/c)+1,f=new o.SimplexNoise2d(.1,3);const p=(0,r.array)(u,d,((t,e)=>{let n=new l(c/2+e*c*i,c/2*(e%2)+t*c);return n.sample=(1+f.getNoise2d(n.x/a.h/2,n.y/a.h/2))/2,n}));let v=[];for(let t=0;t<1e3;++t)v.push(new h((0,r.rnd)(a.w),(0,r.rnd)(a.h)));return{ctx:e,viewport:a,samplers:p,r:c/2,particles:v}}),(function(t,e){for(let t of e.particles){let n=c(t.pos.x,t.pos.y,2*e.r),[o,i]=n.reduce((([t,n],[s,r])=>{let o=e.samplers[s];if(void 0===o)return[t,n];let i=o[r];return void 0===i?[t,n]:[t+i.sample*a,n+1]}),[0,0]);if(i>0){o/=i;let n=t.pos.x+.1*e.r*Math.cos(o),a=t.pos.y+.1*e.r*Math.sin(o);n<0||a<0||n>e.viewport.w||a>e.viewport.h?t.pos=t.lastRenderedPos=new s.Point((0,r.rnd)(e.viewport.w),(0,r.rnd)(e.viewport.h)):t.pos=new s.Point(n,a)}}return e}),(function(t,e){const{ctx:n,viewport:s,samplers:r,r:o}=e;n.strokeStyle="rgba(255, 255, 255, .01)",n.save(),n.translate(s.x,s.y);for(let t of e.particles)n.beginPath(),n.moveTo(t.lastRenderedPos.x,t.lastRenderedPos.y),n.lineTo(t.pos.x,t.pos.y),t.lastRenderedPos=t.pos,n.stroke();n.restore()})).start()})()})();