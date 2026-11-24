import { BassAudio, type BassFailure } from "../src/bass-audio";

const output = document.querySelector<HTMLElement>("#results")!;
const summary = document.querySelector<HTMLElement>("#summary")!;
const run = document.querySelector<HTMLButtonElement>("#run")!;
const pause = (ms:number) => new Promise<void>(done=>setTimeout(done,ms));
const assert = (value:unknown,message:string) => {if(!value)throw new Error(message);};
async function wait(check:()=>boolean, timeout=10000) {
  const until=performance.now()+timeout;
  while(!check()) {if(performance.now()>until)throw new Error("等待超时");await pause(15);}
}
run.addEventListener("click",async()=>{
  run.disabled=true;output.replaceChildren();summary.textContent="检查中…";
  const context=new AudioContext();await context.resume();
  let passed=0,failed=0;
  const hosts:HTMLElement[]=[];
  const registration=await navigator.serviceWorker.register("/tests/audio-fault-worker.js",{scope:"/tests/"});
  try {
    await wait(()=>!!navigator.serviceWorker.controller);
    const fault=(value:string)=>new Promise<void>(done=>{
      const channel=new MessageChannel();channel.port1.onmessage=()=>{channel.port1.close();done();};
      navigator.serviceWorker.controller!.postMessage({fault:value},[channel.port2]);
    });
    let instance=0;
    const create=()=>{
      const host=document.createElement("div");document.querySelector("#media")!.append(host);hosts.push(host);
      const failures:BassFailure[]=[];
      const voice=new BassAudio(host,()=>{},reason=>failures.push(reason));voice.prepare();
      // Isolate browser media-cache entries between fault scenarios. Within a
      // scenario, retries keep exactly the same URL and media element.
      for(const audio of host.querySelectorAll("audio")){
        const url=new URL(audio.src);url.searchParams.set("qa_audio_case",String(instance));audio.src=url.href;audio.load();
      }
      instance++;
      const note=host.querySelector<HTMLAudioElement>('[data-bass-note="31"]')!;
      return {voice,host,note,failures};
    };
    const meters=new WeakMap<HTMLAudioElement,AnalyserNode>();
    async function audible(audio:HTMLAudioElement,trigger:()=>void) {
      let meter=meters.get(audio);if(!meter){meter=context.createAnalyser();meter.fftSize=4096;
        context.createMediaElementSource(audio).connect(meter).connect(context.destination);meters.set(audio,meter);}
      const samples=new Float32Array(meter.fftSize);let peak=0;trigger();
      try{await wait(()=>{meter!.getFloatTimeDomainData(samples);for(const n of samples)peak=Math.max(peak,Math.abs(n));return peak>.008&&audio.currentTime>0&&!audio.paused;});}
      catch{throw new Error(`没有音频输出：time=${audio.currentTime}, ready=${audio.readyState}, error=${audio.error?.message ?? "none"}, peak=${peak}`);}
      return peak;
    }
    async function check(name:string,test:()=>Promise<void>){const li=document.createElement("li");try{await test();li.className="pass";li.textContent="通过 · "+name;passed++;}catch(e){li.className="fail";li.textContent="失败 · "+name+" · "+String(e);failed++;}output.append(li);}
    for(const scenario of ["network","decode"]){await check(scenario==="network"?"首次断网后恢复，同一琴音重试有实际输出":"损坏 WAV 后恢复，同一琴音重新解码播放",async()=>{
      await fault(scenario);const {voice,note,failures,host}=create();
      try{await wait(()=>!!note.error);voice.note(31);await wait(()=>failures.length>0);
        assert(failures.length===1&&failures[0]==="resource","一次失败被重复报告或原因错误");
        await fault("none");const peak=await audible(note,()=>voice.note(31));
        assert(!note.error&&peak>.008,"恢复后仍然无声");assert(failures.length===1,"成功重试误报失败");
      }finally{voice.stop();host.remove();await fault("none");}
    });}
    await check("示范已开始后音源解码出错，报告失败并停止；恢复音源后可以重听",async()=>{
      const {voice,host,failures}=create();const demo=host.querySelector<HTMLAudioElement>("[data-bass-demo]")!;
      const source=demo.src;
      try{await audible(demo,()=>voice.listen());
        // The initial play() has resolved. A real subsequent MediaError must
        // still be reported, rather than leaving the score stuck in demo mode.
        demo.src="data:audio/wav;base64,aW52YWxpZA==";demo.load();await wait(()=>failures.length>0);
        assert(failures.length===1&&demo.paused,"播放中错误没有停止或被重复报告");
        demo.src=source;await audible(demo,()=>voice.listen());assert(!demo.error,"示范仍处于错误状态");
      }finally{voice.stop();host.remove();}
    });
    await check("同音重拨与换弦时，真实混音波形没有截断前音的尖峰", async () => {
      await context.audioWorklet.addModule("/tests/bass-edge-meter.js");
      const {voice,host,note}=create();
      const meter = new AudioWorkletNode(context, "bass-edge-meter");
      meter.connect(context.destination);
      const connect = (audio: HTMLAudioElement) => context.createMediaElementSource(audio).connect(meter);
      host.querySelectorAll("audio").forEach(connect);
      const observer = new MutationObserver(records => {
        for (const record of records) for (const node of record.addedNodes)
          if (node instanceof HTMLAudioElement) connect(node);
      });
      observer.observe(host, { childList: true });
      const readJump = () => new Promise<number>(resolve => {
        meter.port.onmessage = event => resolve(event.data);
        meter.port.postMessage("read");
      });
      try {
        voice.setMix({enabled:true, volume:.8});
        voice.note(31);
        await wait(() => note.ended);
        await pause(100);
        const solo = await readJump();
        assert(solo > .01, "没有测到单音");
        for (let i=0; i<18; i++) {
          voice.note(i%5===0 ? 28 : 31);
          await pause(72 + i%7*9);
        }
        const repeated = await readJump();
        assert(repeated > .01 && repeated < solo * 3 + .02,
          `换弦出现突变，单拨 ${solo.toFixed(3)}、连拨 ${repeated.toFixed(3)}`);
      } finally {
        observer.disconnect(); meter.disconnect(); meter.port.close(); voice.stop(); host.remove();
      }
    });
    await check("快速乱弹与反复停止不误报取消，最后一音有声；停下后没有残留音",async()=>{
      const {voice,host,note,failures}=create();
      try{for(let i=0;i<80;i++){voice.note([31,35,38,43][i%4]);if(i%7===0)voice.stop();await pause(5);}
        await audible(note,()=>voice.note(31));voice.stop();await pause(80);
        assert(failures.length===0,"主动取消被误报播放失败");assert([...host.querySelectorAll("audio")].every(a=>a.paused),"停止后仍有声音");
      }finally{voice.stop();host.remove();}
    });
    await check("琴声关闭与音量为零不会误报，恢复后同一琴弦仍有真实输出",async()=>{
      const {voice,host,note,failures}=create();
      try{voice.setMix({enabled:false,volume:.45});voice.note(31);await pause(100);assert(note.paused&&note.muted,"关闭琴声仍在弹奏");
        voice.setMix({enabled:true,volume:0});voice.note(31);await pause(100);assert(note.paused&&note.muted,"零音量仍开始弹奏");
        voice.setMix({enabled:true,volume:.45});await audible(note,()=>voice.note(31));assert(failures.length===0,"静音恢复误报失败");
      }finally{voice.stop();host.remove();}
    });
    await check("模拟浏览器阻止首次播放时解释权限，下一次真实手势可正常重试",async()=>{
      const {voice,host,note,failures}=create();const play=note.play.bind(note);
      try{note.play=()=>Promise.reject(new DOMException("QA autoplay blocked","NotAllowedError"));voice.note(31);await wait(()=>failures.length>0);
        assert(failures[0]==="permission","没有区分浏览器播放限制");note.play=play;await audible(note,()=>voice.note(31));
      }finally{note.play=play;voice.stop();host.remove();}
    });
  }catch(e){failed++;const li=document.createElement("li");li.className="fail";li.textContent=String(e);output.append(li);}
  finally{for(const host of hosts){host.querySelectorAll("audio").forEach(a=>a.pause());host.remove();}await registration.unregister();await context.close();summary.textContent=`${passed} 项通过，${failed} 项失败`;run.disabled=false;}
});
