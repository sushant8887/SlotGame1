import { _decorator, Component, AudioClip, AudioSource, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {
    @property({ type: [AudioClip] })
    audioClips: AudioClip[] = [];

    private static _instance: AudioManager;
    private audioMap: Map<string, AudioClip> = new Map();
    private loopSource: AudioSource = null;
    private bgSource: AudioSource = null;

    // onLoad in AudioManager.ts
    onLoad() {
        AudioManager._instance = this;

        for (const clip of this.audioClips) {
            this.audioMap.set(clip.name, clip);
        }

        // Create separate audio nodes
        const bgNode = new Node('BgAudio');
        const loopNode = new Node('LoopAudio');
        const sfxNode = new Node('SFXAudio');

        this.node.addChild(bgNode);
        this.node.addChild(loopNode);
        this.node.addChild(sfxNode);

        this.bgSource = bgNode.addComponent(AudioSource);
        this.loopSource = loopNode.addComponent(AudioSource);
        // For playOnce we’ll dynamically attach to sfxNode

        this.bgSource.clip = this.audioMap.get('backgroundcommon');
        this.bgSource.loop = true;
        this.bgSource.volume = 0.2;
        this.bgSource.play();
    }


    public static playLoop(name: string) {
        const clip = this._instance.audioMap.get(name);
        if (!clip || !this._instance.loopSource) return;

        this._instance.loopSource.clip = clip;
        this._instance.loopSource.loop = true;
        this._instance.loopSource.volume = 1;
        this._instance.loopSource.play();

        // Lower background audio
        if (this._instance.bgSource) {
            this._instance.bgSource.volume = 0.2;
        }
    }

    public static stopLoop() {
        if (this._instance.loopSource) {
            this._instance.loopSource.stop();
        }

        // Restore background volume
        if (this._instance.bgSource) {
            this._instance.bgSource.volume = 0.5;
        }
    }

    public static playOnce(name: string) {
        const clip = this._instance.audioMap.get(name);
        if (!clip) return;

        const sfxNode = this._instance.node.getChildByName('SFXAudio');
        const source = sfxNode.getComponent(AudioSource) || sfxNode.addComponent(AudioSource);
        source.playOneShot(clip);
    }
    
}
