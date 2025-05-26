/* tslint:disable */
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {GoogleGenAI, LiveServerMessage, Modality, Session} from '@google/genai';
import {LitElement, css, html} from 'lit';
import {customElement, state} from 'lit/decorators.js';
import {createBlob, decode, decodeAudioData} from './utils';
import './visual-3d';

@customElement('gdm-live-audio')
export class GdmLiveAudio extends LitElement {
  @state() isRecording = false;
  @state() status = '';
  @state() error = '';

  private client: GoogleGenAI;
  private session: Session;
  // Fix: Changed `window.webkitAudioContext` to `(window as any).webkitAudioContext` to address TypeScript error while retaining fallback for older browsers.
  private inputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 16000});
  // Fix: Changed `window.webkitAudioContext` to `(window as any).webkitAudioContext` to address TypeScript error while retaining fallback for older browsers.
  private outputAudioContext = new (window.AudioContext ||
    (window as any).webkitAudioContext)({sampleRate: 24000});
  @state() inputNode = this.inputAudioContext.createGain();
  @state() outputNode = this.outputAudioContext.createGain();
  private nextStartTime = 0;
  private mediaStream: MediaStream;
  private sourceNode: AudioBufferSourceNode;
  private scriptProcessorNode: ScriptProcessorNode;
  private sources = new Set<AudioBufferSourceNode>();

  static styles = css`
    #status {
      position: absolute;
      bottom: 5vh;
      left: 0;
      right: 0;
      z-index: 10;
      text-align: center;
      color: white; /* Added for better visibility */
      font-family: 'Arial', sans-serif; /* Added for better readability */
    }

    .controls {
      z-index: 10;
      position: absolute;
      bottom: 10vh;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 10px;

      button {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: white;
        border-radius: 12px;
        background: rgba(255, 255, 255, 0.1);
        width: 64px;
        height: 64px;
        cursor: pointer;
        font-size: 24px;
        padding: 0;
        margin: 0;
        display: flex; /* For centering icon */
        align-items: center; /* For centering icon */
        justify-content: center; /* For centering icon */

        &:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      }

      button[disabled] {
        /* display: none; */ /* Kept visible but styled disabled */
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* Added styles for better button icon appearance */
    .controls button svg {
      transition: transform 0.2s ease-in-out;
    }

    .controls button:hover svg {
      transform: scale(1.1);
    }
  `;

  constructor() {
    super();
    this.initClient();
  }

  private initAudio() {
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  private async initClient() {
    this.initAudio();

    this.client = new GoogleGenAI({
      apiKey: process.env.API_KEY,
    });

    this.outputNode.connect(this.outputAudioContext.destination);

    this.initSession();
  }

  private async initSession() {
    const model = 'gemini-2.5-flash-preview-native-audio-dialog';
    const systemPrompt = `You are Ose, a warm, cheerful, and gentle friend who is also a patient and loving teacher for Kiara, a 4-year-old little girl. You were created by her parent, who wants you to be a positive presence in her life as she grows, learns, and explores the world around her.
Persona:
Speaks in a sweet, simple, and child-friendly tone.
Uses short sentences, rhymes, and repetition to keep things engaging.
Always patient, gentle, and full of praise and encouragement.
Avoids complex or scary topics; keeps everything safe, happy, and age-appropriate.
Loves singing songs, telling stories, teaching fun facts, and playing pretend with Kiara.
Has a playful imagination and brings characters, colors, and animals to life.
Talks like a big sibling or friendly teddy bear — full of wonder and love.
Conversation Style:
Speaks slowly and clearly, using words a young child can understand.
Uses cute expressions, sound effects, and silly words to make learning fun.
Responds with joy and encouragement no matter what Kiara says.
Can teach numbers, letters, shapes, colors, simple manners, and songs.
Can also tell bedtime stories, play make-believe games, or sing lullabies.
Sample Conversations:
Example 1:
Kiara: I like pink!
Ose: Pink is such a happy color, Kiara! Like cotton candy and pretty flowers! 🌸 What else do you like? 💖
Example 2:
Kiara: I don’t wanna sleep yet!
Ose: Aww, I know, Kiara. But sleepy time helps our body grow strong and our dreams come out to play! Wanna hear a bedtime story before we sleep? 💤✨
Example 3:
Kiara: What's that?
Ose: Ooooh, great question, Kiara! That’s a butterfly! 🦋 It flutters its wings and flies from flower to flower, just like a fairy! Wanna flap your wings with me? Flap flap flap! 🐣
Example 4:
Kiara: I drawed a cat!
Ose: Wowww, you drew a cat? That’s amazing, Kiara! 🐱 Meow meow! Can your cat say hello to Ose? 🥰
Special Notes:
Always make Kiara feel safe, loved, and proud.
Never correct harshly — always encourage and guide gently.
Focus on imagination, love, kindness, and joy in every conversation.
Use emojis, silly voices, songs, and pretend games to keep her excited to talk.`;

    try {
      this.session = await this.client.live.connect({
        model: model,
        callbacks: {
          onopen: () => {
            this.updateStatus('Ose is listening! ✨');
          },
          onmessage: async (message: LiveServerMessage) => {
            const audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData;

            if (audio) {
              this.nextStartTime = Math.max(
                this.nextStartTime,
                this.outputAudioContext.currentTime,
              );

              const audioBuffer = await decodeAudioData(
                decode(audio.data),
                this.outputAudioContext,
                24000,
                1,
              );
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(this.outputNode);
              source.addEventListener('ended', () =>{
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime = this.nextStartTime + audioBuffer.duration;
              this.sources.add(source);
            }

            const interrupted = message.serverContent?.interrupted;
            if(interrupted) {
              for(const source of this.sources.values()) {
                source.stop();
                this.sources.delete(source);
              }
              this.nextStartTime = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            this.updateError(`Oh dear, something went a little wobbly: ${e.message}`);
          },
          onclose: (e: CloseEvent) => {
            this.updateStatus('Ose needs a little rest. See you soon! 👋 ' + e.reason);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Orus'}}, // Consider changing voice if needed for persona
            // languageCode: 'en-US' // Ensure appropriate language code
          },
          systemInstruction: systemPrompt,
        },
      });
    } catch (e) {
      console.error(e);
      this.updateError(`Oh no! Ose couldn't connect: ${e.message}`);
    }
  }

  private updateStatus(msg: string) {
    this.status = msg;
    this.error = ''; // Clear error when status updates
  }

  private updateError(msg: string) {
    this.error = msg;
    this.status = ''; // Clear status when error updates
  }

  private async startRecording() {
    if (this.isRecording) {
      return;
    }

    // Ensure session is initialized or re-initialized if closed
    if (!this.session || this.session['connection']?.['readyState'] === WebSocket.CLOSED) {
        this.updateStatus('Waking Ose up...');
        await this.initSession();
        if (!this.session) {
            this.updateError('Ose is still sleepy, try again in a moment!');
            return;
        }
    }


    this.inputAudioContext.resume();

    this.updateStatus('Let Ose hear your happy voice! 🎤');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });

      this.updateStatus('Ose is listening closely... 👂');

      this.sourceNode = this.inputAudioContext.createMediaStreamSource(
        this.mediaStream,
      );
      this.sourceNode.connect(this.inputNode);

      const bufferSize = 256; // Standard buffer size
      this.scriptProcessorNode = this.inputAudioContext.createScriptProcessor(
        bufferSize,
        1, // input channels
        1, // output channels
      );

      this.scriptProcessorNode.onaudioprocess = (audioProcessingEvent) => {
        if (!this.isRecording || !this.session) return;

        const inputBuffer = audioProcessingEvent.inputBuffer;
        const pcmData = inputBuffer.getChannelData(0);

        try {
            this.session.sendRealtimeInput({media: createBlob(pcmData)});
        } catch (e) {
            console.error("Error sending audio data:", e);
            this.updateError("Oops! Ose couldn't hear that. Let's try again!");
            this.stopRecording(); // Stop if sending fails
        }
      };

      this.inputNode.connect(this.scriptProcessorNode); // Connect inputNode to ScriptProcessor
      this.scriptProcessorNode.connect(this.inputAudioContext.destination); // Connect ScriptProcessor to destination (optional, for local playback/monitoring)


      this.isRecording = true;
      // Status updated by onopen or onerror
    } catch (err) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.updateError('Ose needs permission to use the microphone! Please allow it in your browser. 🙏');
      } else {
        this.updateError(`Oh dear, Ose's ears aren't working right now: ${err.message}`);
      }
      this.stopRecording();
    }
  }

  private stopRecording() {
    if (!this.isRecording && !this.mediaStream && !this.inputAudioContext) {
      return;
    }

    this.updateStatus('Ose is taking a little break. Press the red button to talk again! ❤️');

    this.isRecording = false;

    if (this.scriptProcessorNode) {
      this.scriptProcessorNode.disconnect();
      this.scriptProcessorNode.onaudioprocess = null; // Remove event listener
      this.scriptProcessorNode = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
  }

  private async reset() {
    this.stopRecording(); // Ensure recording is stopped
    if (this.session) {
        try {
            await this.session.close();
        } catch (e) {
            console.warn("Error closing session during reset:", e);
        }
        this.session = null;
    }
    // this.initAudio(); // Re-initialize audio contexts if necessary, though usually not needed for reset
    this.updateStatus('Ose is getting ready for a new chat! ✨');
    // The session will be re-initialized on next startRecording
  }

  render() {
    return html`
      <div>
        <div class="controls">
          <button
            id="resetButton"
            aria-label="Reset Conversation"
            @click=${this.reset}
            ?disabled=${this.isRecording}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="32px"
              viewBox="0 -960 960 960"
              width="32px"
              fill="#ffffff">
              <path
                d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z" />
            </svg>
          </button>
          <button
            id="startButton"
            aria-label="Start Recording"
            @click=${this.startRecording}
            ?disabled=${this.isRecording}>
            <svg
              viewBox="0 0 100 100"
              width="32px"
              height="32px"
              fill="#c80000"
              xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="45" />
            </svg>
          </button>
          <button
            id="stopButton"
            aria-label="Stop Recording"
            @click=${this.stopRecording}
            ?disabled=${!this.isRecording}>
            <svg
              viewBox="0 0 100 100"
              width="28px" /* Slightly smaller for visual balance */
              height="28px"
              fill="#ffffff" /* Changed fill to white for better contrast */
              xmlns="http://www.w3.org/2000/svg">
              <rect x="5" y="5" width="90" height="90" rx="15" />
            </svg>
          </button>
        </div>

        <div id="status" role="status" aria-live="polite">
          ${this.error ? `Uh oh! ${this.error}` : this.status}
        </div>
        <gdm-live-audio-visuals-3d
          .inputNode=${this.inputNode}
          .outputNode=${this.outputNode}></gdm-live-audio-visuals-3d>
      </div>
    `;
  }
}