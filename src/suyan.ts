import type { Activities } from "./activities";
import type { World, DepthLayer } from "./world";
import type { LetterHandoff } from "./resident-story";
import { sceneArt } from "./scene-art";
import { drawSuyan } from "./suyan-art";
import { suyanSpot } from "./suyan-data";
import { gardenWorking, type GardenResidents } from "./garden-residents";
import { drawGardenGesture } from "./garden-gesture-art";
import { drawResidentWalk } from "./resident-walk";
import { greetGardenVisitor, type VisitorGesture } from "./garden-visitor-dialogue";
import { drawEnvelope, drawPlayerReach, gesturePulse } from "./visitor-gesture-art";
import { facingFromMovement } from "./core";
const motion=matchMedia("(prefers-reduced-motion: reduce)");

export class Suyan {
  private greeting = false;
  private gesture:VisitorGesture = "idle";
  private started=0;

  constructor(private world: World, private activities: Activities,
    private mail: LetterHandoff,private residents:GardenResidents) {
    const layers = world.getDepthLayers, presentation=world.getActorPresentation;
    world.getDepthLayers = () => {
      if(world.scene!=="garden" || !residents.visible("suyan"))return layers();
      const draw=[...layers(),this.layer()];
      const reach=this.tapReach(), foot=residents.get("suyan").foot;
      const side=world.player.x>=foot.x ? 1 : -1;
      const front=Math.max(foot.y,world.player.y)+.5;
      if(reach>0) {
        const heavy=this.gesture!=="tap";
        // A tap starts with a hand already beside the cheek. The full swing also
        // crosses a higher lateral arc before the palm makes contact.
        const swing=heavy && !motion.matches ? Math.sin(Math.PI*reach) : 0;
        const cheek={x:foot.x+side*(4+10*swing),y:foot.y-27};
        draw.push({y:front,draw:c=>drawPlayerReach(c,world.player,cheek,reach,6*swing)});
      }
      if(this.greeting && (this.gesture==="slapOffer" || this.gesture==="give")) {
        const age=world.ambientTime-this.started;
        const held=this.gesture==="slapOffer";
        const reveal=!held || motion.matches ? 1 : Math.max(0,Math.min(1,(age-.4)/.42));
        const travel=held?0:Math.min(1,age/.65);
        if((held && reveal>0) || (!held && travel<1)) {
          const x=foot.x+side*(5+4*reveal), y=foot.y-12-5*reveal;
          draw.push({y:front,draw:c=>drawEnvelope(c,x+(world.player.x-x)*travel,y+(world.player.y-18-y)*travel,-side*.18)});
        }
      }
      return draw;
    };
    world.getActorPresentation=()=>{
      if(world.scene!=="garden" || !this.greeting)return presentation();
      const at=residents.get("suyan").foot;
      const dx=at.x-world.player.x,dy=at.y-world.player.y;
      return {facing:facingFromMovement(world.facing,dx,dy),lean:this.tapReach()*(dx<0?-1:1)*.05};
    };
  }

  interact(id: string) {
    if (id !== suyanSpot.id || this.world.scene !== "garden" || !this.residents.interactable("suyan")) return false;
    if (this.greeting && this.activities.dialogueOpen) return true;
    if (this.world.busy || this.world.paused || this.world.suspended || !gardenWorking("suyan", this.world.currentPhase)) return true;
    greetGardenVisitor("suyan",id,this.world,this.mail,this.dialogue.bind(this),()=>this.activities.close());
    this.world.onAchievementEvent("garden-guest-suyan");
    return true;
  }

  private tapReach(){
    if(!this.greeting || !(this.gesture==="tap" || this.gesture==="slap" || this.gesture==="slapOffer"))return 0;
    const age=this.world.ambientTime-this.started;
    const heavy=this.gesture!=="tap", duration=heavy ? .76 : .42;
    if(age<0 || age>=duration)return 0;
    if(motion.matches)return .96;
    const beat=gesturePulse(age,0,duration);
    return heavy ? beat : .73+.27*beat;
  }

  private dialogue(text: string, options: { title: string; run: () => void }[], gesture:VisitorGesture) {
    this.activities.dialogue(suyanSpot.title, text, options,
      c => { drawSuyan(c, sceneArt.suyan, 24, 52, 47, 1); }, this.residents.anchor("suyan"),
    () => { this.greeting = false;this.residents.talking("suyan",false); });
    this.residents.talking("suyan",true);
    this.greeting = true;
    this.gesture=gesture;this.started=this.world.ambientTime;
  }

  private layer(): DepthLayer {
    const actor=this.residents.get("suyan"), {x,y}=actor.foot;
    return { y, draw: c => {
      c.save();
      c.fillStyle = "#554c4528";
      c.beginPath(); c.ellipse(x,y+1,9,2.5,0,0,Math.PI*2);c.fill();
      const walk = actor.moving && !motion.matches && !this.greeting &&
        drawResidentWalk(c,"suyan",actor.foot,actor.facing,actor.step,43);
      if (!walk && (this.greeting || !drawGardenGesture(c,"suyan",actor,this.world.ambientTime,motion.matches,43))) {
        const recoil=this.greeting && (this.gesture==="slap" || this.gesture==="slapOffer") && !motion.matches
          ? gesturePulse(this.world.ambientTime-this.started,.24,.38) : 0;
        c.translate(x,y);c.rotate(recoil*.075*(this.world.player.x>x?-1:1));
        drawSuyan(c,sceneArt.suyan,0,0,43,this.greeting ? 1 : 0);
      }
      c.restore();
    } };
  }
}
