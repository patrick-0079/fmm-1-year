// QA audio graph only. Report the largest single-sample jump since the last read.
class BassEdgeMeter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.previous = 0;
    this.peak = 0;
    this.port.onmessage = () => {
      this.port.postMessage(this.peak);
      this.peak = 0;
    };
  }
  process(inputs) {
    const samples = inputs[0]?.[0];
    if (samples) {
      for (const value of samples) {
        this.peak = Math.max(this.peak, Math.abs(value - this.previous));
        this.previous = value;
      }
    }
    return true;
  }
}
registerProcessor("bass-edge-meter", BassEdgeMeter);
