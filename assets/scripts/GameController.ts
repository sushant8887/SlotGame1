import { _decorator, Component, Node, Button,Sprite, tween, Vec3, sys, Label, SpriteFrame, CCInteger, UIOpacity } from 'cc';
import { GameApi } from './API/GameApi';
import { ReelController } from './ReelController';
import { Popup } from './Popup';
import { AudioManager } from './AudioManager';

const { ccclass, property } = _decorator;

@ccclass('GameController')
export class GameController extends Component {
    @property({ type: ReelController })
    reelController: ReelController = null;

    @property({ type: Node })
    spinButton: Node = null;

    @property(SpriteFrame)
    normalSprite: SpriteFrame = null;

    @property(SpriteFrame)
    disabledSprite: SpriteFrame = null;

    @property(Node)
    audioBtn: Node = null;

    // @property(Node)
    // spinButton: Node = null;
    

    @property({ type: Label })
    totalBet: Label = null;

    @property({ type: Label })
    balance: Label = null;

    @property(Node)
    betRateSprite: Node = null;

    @property(Label)
    betLabel: Label = null;

    @property(Label)
    totalBetLabel: Label = null;

    private betSteps: number[];
    private currentBetIndex: number = 0;
    private isBgAudioPlaying: boolean = true;
    @property({ type: Popup })
    popup: Popup = null;

    @property({ type: Node })
    iBtn: Node = null;

    @property({ type: Node })
    infoPanel: Node = null;

    @property({ type: Node })
    maxBet: Node = null;

    @property({ type: Label })
    maxLinesLabel: Label = null;

    @property(Node)
    youWinNode: Node = null; 

    @property(SpriteFrame)
    youWinSprite: SpriteFrame = null; 

    @property([SpriteFrame])
    digitSprites: SpriteFrame[] = []; 

    @property(CCInteger)
    winDisplayDuration: number = 2; 
    @property({ type: Node })
    funModeBtn: Node = null;

    @property({ type: Node })
    uploadPopup: Node = null;

    private isSpinning: boolean = false;
    private gameConfig: any = null;
    private maxLines: number = 1;

    async start() {
        const gid = sys.localStorage.getItem('gid'); // already stored earlier
        if (!gid) {
            console.error('GID not found in localStorage');
            return;
        }

        try {
            this.gameConfig = await GameApi.getGameConfig(gid);
            this.betSteps = this.gameConfig.betSteps || [1, 2, 5, 10, 15, 20];
            this.maxLines = this.gameConfig.maxLines || 10;
            this.maxLinesLabel.string = `${this.maxLines}`;
            this.currentBetIndex = 0;
            this.updateBetLabels();
            //console.log('Game Config:', this.gameConfig);
        } catch (err) {
            console.error('Failed to load config:', err);
            this.betSteps = [1];
            this.maxLines = 10;
            this.updateBetLabels();
            //console.error('Failed to fetch game config:', err);
        }

        //this.updateBetLabels();

        // Add touch event to sprite
        this.betRateSprite.on(Node.EventType.TOUCH_END, this.onBetSpriteClicked, this);
        this.maxBet.on(Node.EventType.TOUCH_END, this.onMaxBetClicked, this);
    }
    onLoad() {
        this.loadPlayerData();
        GameApi.setPopup(this.popup);
        this.spinButton.on(Button.EventType.CLICK, this.onSpinClicked, this);
        if (this.iBtn) {
            this.iBtn.on(Node.EventType.TOUCH_END, this.onInfoButtonClick, this);
        }

        if (this.infoPanel) {
            this.infoPanel.on(Node.EventType.TOUCH_END, this.onInfoPanelClick, this);
            this.infoPanel.active = false; // Start hidden
        }
    }

    // Inside GameController
    async loadPlayerData() {
        const data = await GameApi.getPlayerDetails();
        if (data && data.balance !== undefined) {
            this.updateBalance(data.balance);
        }
    }

    updateBalance(newBalance: number) {
        if (this.balance) {
            this.animateLabelValue(this.balance, Number(this.balance.string), newBalance, 1000);
        }
    }

    
    onInfoButtonClick() {
        if (this.infoPanel) {
            AudioManager.playOnce('stoproll');
            this.infoPanel.active = true;
        }
    }

    onInfoPanelClick() {
        if (this.infoPanel) {
            AudioManager.playOnce('stoproll');

            this.infoPanel.active = false;
        }
    }

    onBetSpriteClicked() {
        AudioManager.playOnce('get');

        if (this.betSteps.length === 0) return;

        this.currentBetIndex = (this.currentBetIndex + 1) % this.betSteps.length;
        this.updateBetLabels();

        const allPaylines = this.getAllPaylines();
        this.showWinningPaylines(allPaylines);

        if (this.betRateSprite) {
            const originalScale = this.betRateSprite.scale.clone(); // Save original scale
            tween(this.betRateSprite)
                .to(0.1, { scale: new Vec3(1.1, 1.1, 1) })
                .to(0.1, { scale: originalScale })
                .start();
        }
    }

    getAllPaylines(): any[] {
        return [
            { lineId: 0 }, { lineId: 1 }, { lineId: 2 }, { lineId: 3 }, { lineId: 4 },
            { lineId: 5 }, { lineId: 6 }, { lineId: 7 }, { lineId: 8 }, { lineId: 9 }
        ];
    }
    
    onMaxBetClicked() {
        AudioManager.playOnce('get');
        if (this.betSteps.length === 0) return;
        this.currentBetIndex = this.betSteps.length - 1;
        this.updateBetLabels();
    }

    toggleBackgroundAudio() {
        const audioManager = AudioManager['_instance'];
        const bg = audioManager?.['bgSource'];
        const btnSprite = this.audioBtn.getComponent(Sprite);

        if (!bg || !btnSprite) return;

        if (this.isBgAudioPlaying) {
            bg.stop();
            btnSprite.spriteFrame = this.disabledSprite;
        } else {
            bg.loop = true;
            bg.play();
            btnSprite.spriteFrame = this.normalSprite;
        }
        this.isBgAudioPlaying = !this.isBgAudioPlaying;
    }
    
    updateBetLabels() {
        const currentBet = this.betSteps[this.currentBetIndex];
        const totalBet = currentBet * this.maxLines;
        this.totalBetLabel.string = totalBet.toString();
        this.betLabel.string = currentBet.toString();
    }

    
    async onSpinClicked() {
        this.clearPaylines();
        if (this.isSpinning) return;

        this.isSpinning = true;
        this.spinButton.getComponent(Button).interactable = false;
        this.disableBetRateSpriteTouch();

        try {
            const bet = this.betSteps[this.currentBetIndex];
            const lines = this.gameConfig?.maxLines || 10;
            const result = await GameApi.spin(bet, lines);
            AudioManager.playLoop('spin');
            this.reelController.startReelSpin();

            await this.reelController.stopReelsWithResult(result);

            this.totalBet.string = `${result.totalBet}`;
            //this.balance.string = `${result.balance}`;
            this.animateLabelValue(this.balance, Number(this.balance.string), result.balance, 1000);
            this.showWinningPaylines(result.winningPaylines);
            if (result.totalWin && result.totalWin > 0) {
                this.showWinAmount(result.totalWin);
            }
        } catch (error) {
            console.error('Spin error:', error);

            AudioManager.stopLoop();
            this.reelController.stopAllReelsImmediately(); 
            if (this.popup) {
                this.popup.show("Spin failed. Please try again.");
            }
        } finally {
            AudioManager.stopLoop();
            this.spinButton.getComponent(Button).interactable = true;
            this.enableBetRateSpriteTouch();
            this.isSpinning = false;
        }
    
    }
    
    disableBetRateSpriteTouch() {
        this.betRateSprite.off(Node.EventType.TOUCH_END, this.onBetSpriteClicked, this);
    }

    enableBetRateSpriteTouch() {
        this.betRateSprite.on(Node.EventType.TOUCH_END, this.onBetSpriteClicked, this);
    }

    
    animateLabelValue(label: Label, from: number, to: number, duration: number) {
        const start = from;
        const end = to;
        const startTime = performance.now();

        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (end - start) * progress);
            label.string = `${current}`;

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

    showWinningPaylines(winningPaylines: any[]) {
        const paylineNames = [
            "Top",
            "Middle",
            "Bottom",
            "V_shape",
            "Inverted_V",
            "Upward_slope",
            "Downward_slope",
            "M_shape",
            "W_shape",
            "Hill"
        ];

        const container = this.reelController.node;
        if (!container) {
            //console.warn('ReelContainer (via reelController) not found');
            return;
        }

        for (const name of paylineNames) {
            const lineNode = container.getChildByName(name);
            if (lineNode) {
                lineNode.active = false;
            }
        }

        // If there are winning paylines, show them and play audio
        if (winningPaylines.length > 0) {
            AudioManager.playOnce('win_normal_1'); 

            for (const payline of winningPaylines) {
                const lineName = paylineNames[payline.lineId];
                const lineNode = container.getChildByName(lineName);
                if (lineNode) {
                    lineNode.active = true;
                }
            }
        }
    }
    
    
    clearPaylines() {
        const paylineNames = [
            "Top",
            "Middle",
            "Bottom",
            "V_shape",
            "Inverted_V",
            "Upward_slope",
            "Downward_slope",
            "M_shape",
            "W_shape",
            "Hill"
        ];

        const container = this.reelController.node;
        if (!container) {
            console.warn('ReelContainer (via reelController) not found');
            return;
        }

        for (const name of paylineNames) {
            const lineNode = container.getChildByName(name);
            if (lineNode) {
                lineNode.active = false;
            }
        }
    }
    
    showWinAmount(totalWin: number) {
        if (!this.youWinNode) return;

        const amountNode = this.youWinNode.getChildByName("amount");
        if (!amountNode) return;

        const digits = totalWin.toString().split('');

        // Ensure enough digit nodes
        while (amountNode.children.length < digits.length) {
            const digitNode = new Node();
            const sprite = digitNode.addComponent(Sprite);
            amountNode.addChild(digitNode);
        }

        for (let i = 0; i < amountNode.children.length; i++) {
            const digitNode = amountNode.children[i];
            const sprite = digitNode.getComponent(Sprite);

            if (i < digits.length) {
                const digit = parseInt(digits[i]);
                sprite.spriteFrame = this.digitSprites[digit];
                digitNode.active = true;
            } else {
                digitNode.active = false;
            }
        }

        // Ensure UIOpacity component exists
        let opacityComp = this.youWinNode.getComponent(UIOpacity);
        if (!opacityComp) {
            opacityComp = this.youWinNode.addComponent(UIOpacity);
        }

        // Set initial styles
        this.youWinNode.active = true;
        this.youWinNode.setScale(new Vec3(0.5, 0.5, 1)); // pop from small
        opacityComp.opacity = 0;

        // Pop-in + fade-in animation
        tween(this.youWinNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();

        tween(opacityComp)
            .to(0.3, { opacity: 255 })
            .delay(this.winDisplayDuration)
            .to(0.3, { opacity: 0 })
            .call(() => {
                this.youWinNode.active = false;
            })
            .start();
    }
    
    

    async fakeSpinAnimation() {
        await this.reelController.startReelSpin();

        const result = await GameApi.spin(10, 8);

        // Stop reels one by one
        await this.reelController.stopReelsWithResult(result);
        
    }
}
