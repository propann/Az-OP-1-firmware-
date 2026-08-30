import { MidiDeviceInfo, MidiMessageLog, MidiMappingConfig } from '../types';

type NoteOnCallback = (note: number, velocity: number) => void;
type NoteOffCallback = (note: number) => void;
type CCCallback = (cc: number, value: number) => void;
type PitchBendCallback = (value: number) => void;
type DeviceChangeCallback = (devices: MidiDeviceInfo[], activeDevice: MidiDeviceInfo | null) => void;
type LogCallback = (log: MidiMessageLog) => void;

export class WebMidiManager {
  private midiAccess: any = null;
  private isSupported: boolean = false;
  private isConnected: boolean = false;
  private devices: MidiDeviceInfo[] = [];
  private activeDeviceId: string | null = null;
  private messageLogs: MidiMessageLog[] = [];
  private maxLogs: number = 60;

  // Callbacks
  private noteOnListeners: Set<NoteOnCallback> = new Set();
  private noteOffListeners: Set<NoteOffCallback> = new Set();
  private ccListeners: Set<CCCallback> = new Set();
  private pitchBendListeners: Set<PitchBendCallback> = new Set();
  private deviceChangeListeners: Set<DeviceChangeCallback> = new Set();
  private logListeners: Set<LogCallback> = new Set();

  // Mapping - Fully conforming to official Teenage Engineering OP-1 MIDI Specification
  public mapping: MidiMappingConfig = {
    blueKnobCC: 1,      // Modulation / OP-1 Blue Encoder (CC1 or CC16)
    greenKnobCC: 2,     // Breath / OP-1 Green Encoder (CC2 or CC17)
    whiteKnobCC: 3,     // OP-1 White Encoder (CC3 or CC18)
    orangeKnobCC: 4,    // Foot Controller / OP-1 Orange Encoder (CC4 or CC19)
    pitchBendEnabled: true,
    synthModeCC: 50,    // Synth Mode Selection
    drumModeCC: 51,     // Drum Mode Selection
    tapeModeCC: 52,     // Tape Mode Selection
    mixerModeCC: 53,    // Mixer Mode Selection
    playCC: 115,        // Tape Play
    stopCC: 116,        // Tape Stop
    recordCC: 117       // Tape Record
  };

  constructor() {
    this.checkSupport();
  }

  public checkSupport(): boolean {
    if (typeof window !== 'undefined' && 'navigator' in window && 'requestMIDIAccess' in navigator) {
      this.isSupported = true;
      return true;
    }
    this.isSupported = false;
    return false;
  }

  public async init(): Promise<boolean> {
    if (!this.checkSupport()) {
      console.warn('[WebMidiManager] Web MIDI API not supported in this browser environment.');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      this.isConnected = true;
      this.updateDeviceList();

      this.midiAccess.onstatechange = (e: any) => {
        this.updateDeviceList();
        this.addLog({
          id: `midi-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          type: 'sysex',
          channel: 1,
          data1: 0,
          data2: 0,
          formatted: `Port state change: ${(e?.port as any)?.name || 'Port'} -> ${(e?.port as any)?.state}`
        });
      };

      return true;
    } catch (err) {
      console.warn('[WebMidiManager] Failed to obtain Web MIDI access:', err);
      this.isConnected = false;
      return false;
    }
  }

  private updateDeviceList() {
    if (!this.midiAccess) return;

    const inputs: MidiDeviceInfo[] = [];
    const inputEntries = this.midiAccess.inputs.values();

    for (const input of inputEntries) {
      const isOP1 = (input.name?.toLowerCase().includes('op-1') || 
                     input.name?.toLowerCase().includes('teenage') ||
                     input.manufacturer?.toLowerCase().includes('teenage')) || false;

      inputs.push({
        id: input.id,
        name: input.name || `MIDI Port ${input.id}`,
        manufacturer: input.manufacturer || 'Generic MIDI Device',
        state: input.state,
        connection: input.connection,
        isOP1Device: isOP1
      });

      // Bind listener
      input.onmidimessage = this.handleMidiMessage.bind(this);
    }

    this.devices = inputs;

    // Prefer OP-1 if available, otherwise first connected device
    if (!this.activeDeviceId && inputs.length > 0) {
      const op1Dev = inputs.find(d => d.isOP1Device);
      this.activeDeviceId = op1Dev ? op1Dev.id : inputs[0].id;
    }

    const activeDev = this.getActiveDevice();
    this.deviceChangeListeners.forEach(cb => cb(this.devices, activeDev));
  }

  private handleMidiMessage(event: any) {
    const data = event.data;
    if (!data || data.length === 0) return;

    const status = data[0];
    const messageType = status >> 4;
    const channel = (status & 0xf) + 1;
    const data1 = data.length > 1 ? data[1] : 0;
    const data2 = data.length > 2 ? data[2] : 0;

    const timeStr = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Note On (0x9)
    if (messageType === 0x9 && data2 > 0) {
      const note = data1;
      const velocity = data2;
      this.noteOnListeners.forEach(cb => cb(note, velocity));
      this.addLog({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        type: 'noteOn',
        channel,
        data1: note,
        data2: velocity,
        formatted: `Note ON : Note #${note} (Vel ${velocity}) [Ch ${channel}]`
      });
      return;
    }

    // Note Off (0x8 or Note On with velocity 0)
    if (messageType === 0x8 || (messageType === 0x9 && data2 === 0)) {
      const note = data1;
      this.noteOffListeners.forEach(cb => cb(note));
      this.addLog({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        type: 'noteOff',
        channel,
        data1: note,
        data2: 0,
        formatted: `Note OFF: Note #${note} [Ch ${channel}]`
      });
      return;
    }

    // Control Change (0xB)
    if (messageType === 0xb) {
      const cc = data1;
      const val = data2;
      this.ccListeners.forEach(cb => cb(cc, val));

      // Friendly CC label according to OP-1 Hardware Controller Spec
      let ccName = `CC #${cc}`;
      if (cc === 1 || cc === 16 || cc === this.mapping.blueKnobCC) ccName = 'BLUE ENCODER (CC1/16)';
      else if (cc === 2 || cc === 17 || cc === this.mapping.greenKnobCC) ccName = 'GREEN ENCODER (CC2/17)';
      else if (cc === 3 || cc === 18 || cc === this.mapping.whiteKnobCC) ccName = 'WHITE ENCODER (CC3/18)';
      else if (cc === 4 || cc === 19 || cc === this.mapping.orangeKnobCC) ccName = 'ORANGE ENCODER (CC4/19)';
      else if (cc === 50) ccName = 'OP-1 SYNTH MODE';
      else if (cc === 51) ccName = 'OP-1 DRUM MODE';
      else if (cc === 52) ccName = 'OP-1 TAPE MODE';
      else if (cc === 53) ccName = 'OP-1 MIXER MODE';
      else if (cc === 115) ccName = 'OP-1 PLAY';
      else if (cc === 116) ccName = 'OP-1 STOP';
      else if (cc === 117) ccName = 'OP-1 REC';

      this.addLog({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        type: 'cc',
        channel,
        data1: cc,
        data2: val,
        formatted: `Control Change: ${ccName} = ${val} (${Math.round((val / 127) * 100)}%)`
      });
      return;
    }

    // Pitch Bend (0xE)
    if (messageType === 0xe) {
      const bend14Bit = (data2 << 7) | data1;
      const normalized = (bend14Bit - 8192) / 8192; // -1.0 to +1.0
      this.pitchBendListeners.forEach(cb => cb(normalized));
      this.addLog({
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: timeStr,
        type: 'pitchBend',
        channel,
        data1: data1,
        data2: data2,
        formatted: `Pitch Bend: ${(normalized * 100).toFixed(1)}%`
      });
      return;
    }
  }

  private addLog(log: MidiMessageLog) {
    this.messageLogs.unshift(log);
    if (this.messageLogs.length > this.maxLogs) {
      this.messageLogs.pop();
    }
    this.logListeners.forEach(cb => cb(log));
  }

  public getDevices(): MidiDeviceInfo[] {
    return this.devices;
  }

  public getActiveDevice(): MidiDeviceInfo | null {
    if (!this.activeDeviceId) return null;
    return this.devices.find(d => d.id === this.activeDeviceId) || null;
  }

  public setActiveDevice(id: string) {
    this.activeDeviceId = id;
    const activeDev = this.getActiveDevice();
    this.deviceChangeListeners.forEach(cb => cb(this.devices, activeDev));
  }

  public getLogs(): MidiMessageLog[] {
    return this.messageLogs;
  }

  // Virtual test helper methods
  public triggerVirtualNote(note: number, velocity: number = 100, durationMs: number = 350) {
    this.noteOnListeners.forEach(cb => cb(note, velocity));
    setTimeout(() => {
      this.noteOffListeners.forEach(cb => cb(note));
    }, durationMs);
  }

  public triggerVirtualCC(cc: number, val: number) {
    this.ccListeners.forEach(cb => cb(cc, val));
  }

  // Listener subscriptions
  public onNoteOn(cb: NoteOnCallback) {
    this.noteOnListeners.add(cb);
    return () => this.noteOnListeners.delete(cb);
  }

  public onNoteOff(cb: NoteOffCallback) {
    this.noteOffListeners.add(cb);
    return () => this.noteOffListeners.delete(cb);
  }

  public onCC(cb: CCCallback) {
    this.ccListeners.add(cb);
    return () => this.ccListeners.delete(cb);
  }

  public onPitchBend(cb: PitchBendCallback) {
    this.pitchBendListeners.add(cb);
    return () => this.pitchBendListeners.delete(cb);
  }

  public onDeviceChange(cb: DeviceChangeCallback) {
    this.deviceChangeListeners.add(cb);
    return () => this.deviceChangeListeners.delete(cb);
  }

  public onLog(cb: LogCallback) {
    this.logListeners.add(cb);
    return () => this.logListeners.delete(cb);
  }
}

export const webMidi = new WebMidiManager();
