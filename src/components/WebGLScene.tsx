"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

interface Props {
  onSlidesUpdate: (scroll: number) => void;
  onSectionUpdate: (scroll: number) => void;
  onDotsUpdate: (scroll: number) => void;
}

export default function WebGLScene({ onSlidesUpdate, onSectionUpdate, onDotsUpdate }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ASSET_BASE = "https://api.getlayers.ai/storage/v1/object/public/public/assets/laocoon-59f84455c6";
    let gltfModel: any, modelPivot: any, mixer: any;
    const clock = new THREE.Clock();
    let currentScroll = 0;
    let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    let cursorX = innerWidth / 2, cursorY = innerHeight / 2;
    let outerCursorX = innerWidth / 2, outerCursorY = innerHeight / 2;

    const shaderUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(innerWidth, innerHeight) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uScroll: { value: 0 },
    };

    let sparkParticles: any;
    const sparkCount = 450, sparkData: any[] = [];
    let sizes = { width: innerWidth, height: innerHeight };

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaf8f3);
    scene.fog = new THREE.FogExp2(0xfaf8f3, 0.01);

    const camera = new THREE.PerspectiveCamera(50, sizes.width / sizes.height, 0.1, 100);
    camera.position.set(0, 0.2, 3.0);
    scene.add(camera);

    // Background shader
    const bgMat = new THREE.ShaderMaterial({
      depthWrite: false, depthTest: false, uniforms: shaderUniforms,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform vec2 uResolution; uniform vec2 uMouse; uniform float uScroll;
        void main(){
          vec2 uv=(gl_FragCoord.xy-.5*uResolution.xy)/uResolution.y;
          float aspect=uResolution.x/uResolution.y,time=uTime*.07,scroll=uScroll,sd=scroll*5.;
          vec2 w=uv;
          w.x+=sin(uv.y*2.5+time*.2+sd)*.35; w.y+=cos(uv.x*2.5-time*.15-sd*.8)*.35;
          w.x+=sin(uv.y*1.2-time*.1-sd*1.5)*.25; w.y+=cos(uv.x*1.2+time*.18+sd*1.2)*.25;
          w+=vec2(scroll*.04,-scroll*.02)+vec2(uMouse.x*aspect*.05,uMouse.y*.05);
          vec2 d1=vec2(cos(.6),sin(.6)),d2=vec2(cos(-.7),sin(-.7)),d3=vec2(cos(1.2),sin(1.2));
          float w1=sin(dot(w,d1)*2.4+time),w2=cos(dot(w,d2)*3.2-time*1.4+w1*.4),w3=sin(dot(w,d3)*4.+time*1.8+w2*.5);
          float wf=w1*.5+w2*.35+w3*.15;
          float ws=pow(max(0.,1.-abs(wf-.1)),2.5),cs=pow(max(0.,1.-abs(wf-.15)),8.),crest=ws*.5+cs*.9;
          vec3 s1base=mix(vec3(.99,.97,.93),vec3(.97,.95,.90),scroll*4.);
          vec3 s1wave1=vec3(.88,.72,.42),s1wave2=vec3(.76,.62,.94),s1crest=vec3(.98,.80,.30);
          vec3 s2base=mix(vec3(.04,.03,.14),vec3(.06,.04,.18),clamp((scroll-.25)*4.,0.,1.));
          vec3 s2wave1=vec3(.28,.14,.72),s2wave2=vec3(.12,.08,.45),s2crest=vec3(.55,.38,.98);
          vec3 s3base=mix(vec3(.02,.14,.09),vec3(.03,.18,.12),clamp((scroll-.5)*4.,0.,1.));
          vec3 s3wave1=vec3(.05,.55,.32),s3wave2=vec3(.02,.35,.22),s3crest=vec3(.20,.88,.58);
          vec3 s4base=mix(vec3(.08,.03,.18),vec3(.12,.04,.25),clamp((scroll-.75)*4.,0.,1.));
          vec3 s4wave1=vec3(.42,.12,.78),s4wave2=vec3(.22,.06,.52),s4crest=vec3(.72,.35,.98);
          float t12=smoothstep(.20,.30,scroll),t23=smoothstep(.45,.55,scroll),t34=smoothstep(.70,.80,scroll);
          vec3 base=mix(mix(mix(s1base,s2base,t12),s3base,t23),s4base,t34);
          vec3 wave1=mix(mix(mix(s1wave1,s2wave1,t12),s3wave1,t23),s4wave1,t34);
          vec3 wave2=mix(mix(mix(s1wave2,s2wave2,t12),s3wave2,t23),s4wave2,t34);
          vec3 cr=mix(mix(mix(s1crest,s2crest,t12),s3crest,t23),s4crest,t34);
          float dark=max(t12,max(t23,t34)),wStr1=mix(.18,.55,dark),wStr2=mix(.22,.45,dark),cStr=mix(.14,.60,dark);
          vec3 col=base;
          col=mix(col,wave2,smoothstep(-.6,.2,wf)*wStr2);
          col=mix(col,wave1,smoothstep(0.,.8,wf)*wStr1);
          col+=cr*crest*cStr;
          col*=1.-dot(uv,uv)*mix(.06,.18,dark);
          gl_FragColor=vec4(col,1.);
        }
      `,
    });
    camera.add(new THREE.Mesh(new THREE.PlaneGeometry(30, 30), bgMat));
    (camera.children[0] as THREE.Mesh).position.set(0, 0, -8);
    (camera.children[0] as THREE.Mesh).renderOrder = -10;

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth <= 600;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: "high-performance" });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(isMobile ? Math.min(devicePixelRatio, 1) : Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isMobile;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.2;

    scene.add(new THREE.AmbientLight(0xfdf8f0, 1.8));
    const kl = new THREE.SpotLight(0xfff3e0, 22);
    kl.position.set(4, 6, 3); kl.angle = Math.PI / 4; kl.penumbra = 0.9;
    kl.castShadow = !isMobile; kl.shadow.mapSize.width = kl.shadow.mapSize.height = 2048; kl.shadow.bias = -0.001;
    scene.add(kl);
    const rl = new THREE.DirectionalLight(0x8b5cf6, 10); rl.position.set(-5, 3, -4); scene.add(rl);
    const fl = new THREE.DirectionalLight(0xe8c97a, 4); fl.position.set(-2, -4, 2); scene.add(fl);
    const al = new THREE.PointLight(0x0891b2, 4, 8); al.position.set(3, 0, 2); scene.add(al);
    const fw = new THREE.DirectionalLight(0xfff8ed, 8); fw.position.set(0, 1, 5); scene.add(fw);

    // Sparks
    const sparkC = document.createElement("canvas"); sparkC.width = sparkC.height = 16;
    const sctx = sparkC.getContext("2d")!;
    const sg = sctx.createRadialGradient(8,8,0,8,8,8);
    sg.addColorStop(0,"rgba(255,255,255,1)"); sg.addColorStop(.25,"rgba(200,180,255,.85)");
    sg.addColorStop(.6,"rgba(124,58,237,.3)"); sg.addColorStop(1,"rgba(0,0,0,0)");
    sctx.fillStyle = sg; sctx.fillRect(0,0,16,16);
    const sparkTex = new THREE.CanvasTexture(sparkC);
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(sparkCount*3), col = new Float32Array(sparkCount*3);
    for(let i=0;i<sparkCount;i++){
      pos[i*3]=(Math.random()-.5)*6.5; pos[i*3+1]=(Math.random()-.5)*5-.5; pos[i*3+2]=(Math.random()-.5)*6.5;
      const r=Math.random();
      if(r<.5){col[i*3]=.9+Math.random()*.08;col[i*3+1]=.62+Math.random()*.18;col[i*3+2]=.12+Math.random()*.15;}
      else if(r<.8){col[i*3]=.55+Math.random()*.25;col[i*3+1]=.18+Math.random()*.18;col[i*3+2]=.82+Math.random()*.18;}
      else{col[i*3]=1;col[i*3+1]=.88+Math.random()*.1;col[i*3+2]=.45+Math.random()*.2;}
      sparkData.push({speedX:(Math.random()-.5)*.35,speedY:.12+Math.random()*.28,speedZ:(Math.random()-.5)*.35,swaySpeed:.5+Math.random()*1.5,swayRadius:.05+Math.random()*.15,phase:Math.random()*Math.PI*2});
    }
    geo.setAttribute("position",new THREE.BufferAttribute(pos,3));
    geo.setAttribute("color",new THREE.BufferAttribute(col,3));
    sparkParticles = new THREE.Points(geo,new THREE.PointsMaterial({size:.022,vertexColors:true,transparent:true,opacity:.75,blending:THREE.AdditiveBlending,depthWrite:false,map:sparkTex}));
    scene.add(sparkParticles);

    // Model
    new GLTFLoader().load(ASSET_BASE+"/bronze_horse.glb",(gltf:any)=>{
      gltfModel=gltf.scene; modelPivot=new THREE.Group(); scene.add(modelPivot); modelPivot.add(gltfModel);
      gltfModel.traverse((child:any)=>{
        if(!child.isMesh)return; child.castShadow=child.receiveShadow=true;
        if(child.material){child.material.roughness=.32;child.material.metalness=.94;child.material.flatShading=false;
          if(child.material.color)child.material.color.lerp(new THREE.Color(0x8b5cf6),.28);
          if(child.material.map)child.material.map.anisotropy=16;child.material.envMapIntensity=1.2;}
      });
      if(gltf.animations?.length){mixer=new THREE.AnimationMixer(gltfModel);gltf.animations.forEach((c:any)=>mixer.clipAction(c).play());}
      const b0=new THREE.Box3().setFromObject(gltfModel),s0=b0.getSize(new THREE.Vector3());
      gltfModel.scale.setScalar(3.5/Math.max(s0.x,s0.y,s0.z,.0001));
      gltfModel.updateMatrixWorld(true);
      gltfModel.position.sub(new THREE.Box3().setFromObject(gltfModel).getCenter(new THREE.Vector3()));
      modelPivot.position.y=-.4;
    },undefined,(e:any)=>console.warn("Model:",e));

    const fogColors=[new THREE.Color(0xfaf8f3),new THREE.Color(0x070412),new THREE.Color(0x021a0d),new THREE.Color(0x0c0418)];
    const _fc=new THREE.Color();

    const onResize=()=>{
      sizes.width=innerWidth; sizes.height=innerHeight;
      camera.aspect=sizes.width/sizes.height; camera.updateProjectionMatrix();
      renderer.setSize(sizes.width,sizes.height); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
      shaderUniforms.uResolution.value.set(sizes.width,sizes.height);
    };
    const onMouseMove=(e:MouseEvent)=>{
      cursorX=e.clientX; cursorY=e.clientY;
      const ci=document.querySelector(".ss-cursor-inner") as HTMLElement;
      if(ci){ci.style.left=cursorX+"px";ci.style.top=cursorY+"px";}
      targetMouseX=(e.clientX/innerWidth)*2-1; targetMouseY=(e.clientY/innerHeight)*2-1;
    };

    const animate=()=>{
      animRef.current=requestAnimationFrame(animate);
      const dt=clock.getDelta();
      if(mixer)mixer.update(dt);
      const max=document.documentElement.scrollHeight-innerHeight;
      const st=window.scrollY??document.documentElement.scrollTop;
      const target=max>0?st/max:0;
      currentScroll+=(target-currentScroll)*.025;
      mouseX+=(targetMouseX-mouseX)*.05; mouseY+=(targetMouseY-mouseY)*.05;
      outerCursorX+=(cursorX-outerCursorX)*.2; outerCursorY+=(cursorY-outerCursorY)*.2;
      const co=document.querySelector(".ss-cursor-outer") as HTMLElement;
      if(co){co.style.left=outerCursorX+"px";co.style.top=outerCursorY+"px";}
      if(modelPivot){modelPivot.rotation.y=mouseX*.25;modelPivot.rotation.x=mouseY*.15;}
      if(sparkParticles){
        const p=sparkParticles.geometry.attributes.position.array as Float32Array;
        const t=clock.getElapsedTime(),sv=Math.abs(target-currentScroll),sm=1+sv*9,turb=sv*.8;
        for(let i=0;i<sparkCount;i++){
          const idx=i*3,d=sparkData[i];
          p[idx]+=d.speedX*dt*sm; p[idx+1]+=d.speedY*dt*sm; p[idx+2]+=d.speedZ*dt*sm;
          const sw=d.swayRadius*(1+turb*4);
          p[idx]+=Math.sin(t*d.swaySpeed+d.phase)*sw*dt; p[idx+2]+=Math.cos(t*d.swaySpeed+d.phase)*sw*dt;
          if(p[idx+1]>3||Math.abs(p[idx])>3.5||Math.abs(p[idx+2])>3.5){p[idx+1]=-2.5;p[idx]=(Math.random()-.5)*3;p[idx+2]=(Math.random()-.5)*3;}
        }
        sparkParticles.geometry.attributes.position.needsUpdate=true;
      }
      const phi=currentScroll*Math.PI*2,rr=4.2-Math.sin(currentScroll*Math.PI)*.6;
      const yy=.35+Math.sin(currentScroll*Math.PI)*.8;
      camera.position.lerp(new THREE.Vector3(rr*Math.sin(phi),yy,rr*Math.cos(phi)),.025);
      const ease=(Math.cos(Math.min(1,currentScroll/.28)*Math.PI)+1)*.5;
      camera.lookAt(new THREE.Vector3(-.9*ease,-.15,0));
      shaderUniforms.uTime.value=clock.getElapsedTime();
      shaderUniforms.uMouse.value.set(mouseX,-mouseY);
      shaderUniforms.uScroll.value=currentScroll;
      // Section fog
      const t12=Math.min(1,Math.max(0,(currentScroll-.2)/.1));
      const t23=Math.min(1,Math.max(0,(currentScroll-.45)/.1));
      const t34=Math.min(1,Math.max(0,(currentScroll-.7)/.1));
      _fc.copy(fogColors[0]).lerp(fogColors[1],t12).lerp(fogColors[2],t23).lerp(fogColors[3],t34);
      if(scene.fog)(scene.fog as any).color.copy(_fc);
      if(scene.background&&(scene.background as any).isColor)(scene.background as any).copy(_fc);
      onSlidesUpdate(currentScroll);
      onSectionUpdate(currentScroll);
      onDotsUpdate(currentScroll);
      renderer.render(scene,camera);
    };

    window.addEventListener("mousemove",onMouseMove);
    window.addEventListener("resize",onResize);
    onResize(); animate();

    return ()=>{
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove",onMouseMove);
      window.removeEventListener("resize",onResize);
      renderer.dispose();
    };
  }, [onSlidesUpdate, onSectionUpdate, onDotsUpdate]);

  return <canvas ref={canvasRef} id="ss-webgl" style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",zIndex:1,outline:"none"}} />;
}
