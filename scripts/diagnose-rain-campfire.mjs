import { SAMPLE_RATE } from './dsp-lab.mjs';

function pinkGenerator() {
  let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
  return () => {
    const white = Math.random()*2-1;
    b0=0.99886*b0+white*0.0555179; b1=0.99332*b1+white*0.0750759;
    b2=0.96900*b2+white*0.1538520; b3=0.86650*b3+white*0.3104856;
    b4=0.55000*b4+white*0.5329522; b5=-0.7616*b5-white*0.0168980;
    const pink=(b0+b1+b2+b3+b4+b5+b6+white*0.5362)*0.11;
    b6=white*0.115926; return pink;
  };
}
function brownGenerator() {
  let last=0;
  return () => { const w=Math.random()*2-1; last=(last+0.02*w)/1.02; return last*3.5; };
}
function whiteGenerator() { return () => Math.random()*2-1; }

// rain base only (no drop impulses)
function rainBaseOnly() {
  const white = whiteGenerator();
  let hp=0, lastW=0;
  return () => { const w=white(); hp=hp*0.7+(w-lastW)*0.7; lastW=w; return hp*1.0; };
}
// campfire base only (no pop impulses)
function campfireBaseOnly() {
  const pink=pinkGenerator(), brown=brownGenerator();
  return () => pink()*0.45 + brown()*0.35;
}
// rain drops only
function rainDropsOnly() {
  let dropEnv=0;
  return () => {
    if (dropEnv<=0.002 && Math.random()<0.006) dropEnv=0.5+Math.random()*0.5;
    const drop = dropEnv*(Math.random()*2-1);
    dropEnv*=0.7;
    return drop*0.55;
  };
}
// campfire pops only
function campfirePopsOnly() {
  let popEnv=0;
  return () => {
    if (popEnv<=0.002 && Math.random()<0.06) popEnv=0.6+Math.random()*0.6;
    const pop = popEnv*(Math.random()*2-1);
    popEnv*=0.8;
    return pop*0.85;
  };
}

function fft(re, im) {
  const n = re.length;
  for (let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
  for (let len=2;len<=n;len<<=1){const ang=(-2*Math.PI)/len;const wr=Math.cos(ang),wi=Math.sin(ang);
    for (let i=0;i<n;i+=len){let cwr=1,cwi=0;
      for (let j=0;j<len/2;j++){const ur=re[i+j],ui=im[i+j];
        const vr=re[i+j+len/2]*cwr-im[i+j+len/2]*cwi, vi=re[i+j+len/2]*cwi+im[i+j+len/2]*cwr;
        re[i+j]=ur+vr; im[i+j]=ui+vi; re[i+j+len/2]=ur-vr; im[i+j+len/2]=ui-vi;
        const ncwr=cwr*wr-cwi*wi, ncwi=cwr*wi+cwi*wr; cwr=ncwr; cwi=ncwi;}}}
}
function spectrum32(sampleFn, seconds=4) {
  const N=1<<17, n=Math.round(SAMPLE_RATE*seconds);
  const raw=new Float64Array(n); for (let i=0;i<n;i++) raw[i]=sampleFn();
  const start=Math.max(0,Math.floor(n/2)-N/2);
  const re=new Float64Array(N), im=new Float64Array(N);
  for (let i=0;i<N;i++){const w=0.5-0.5*Math.cos((2*Math.PI*i)/(N-1)); re[i]=(raw[start+i]||0)*w;}
  fft(re,im);
  const bins=new Float64Array(32); const fMin=20,fMax=20000;
  for (let k=1;k<N/2;k++){const freq=(k*SAMPLE_RATE)/N; if(freq<fMin||freq>fMax) continue;
    const bin=Math.min(31,Math.floor((Math.log(freq/fMin)/Math.log(fMax/fMin))*32)); bins[bin]+=re[k]*re[k]+im[k]*im[k];}
  const total=bins.reduce((a,b)=>a+b,0)||1; for(let i=0;i<32;i++) bins[i]/=total; return bins;
}
function cosineSim(a,b){let dot=0,na=0,nb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];}return dot/(Math.sqrt(na)*Math.sqrt(nb)||1);}

const rainBase = spectrum32(rainBaseOnly());
const campfireBase = spectrum32(campfireBaseOnly());
const rainDrops = spectrum32(rainDropsOnly());
const campfirePops = spectrum32(campfirePopsOnly());

console.log('rainBase vs campfireBase:', cosineSim(rainBase, campfireBase).toFixed(3));
console.log('rainDrops vs campfirePops:', cosineSim(rainDrops, campfirePops).toFixed(3));
console.log('rainBase vs rainDrops:', cosineSim(rainBase, rainDrops).toFixed(3));
console.log('campfireBase vs campfirePops:', cosineSim(campfireBase, campfirePops).toFixed(3));
