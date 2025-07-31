import { _decorator, Component, instantiate, Label, Node, Prefab, tween, UITransform, Vec3 } from 'cc';
import { GameApi } from './API/GameApi';
import SlotConfig from '../resources/slotConfig';
import { AudioManager } from './AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ReelController')
export class ReelController extends Component {
    @property({ type: [Node] })
    reelNodes: Node[] = []; // Should contain 5 nodes (1 per reel)

    @property({ type: [Prefab] })
    stopPrefabs: Prefab[] = []; // Should contain all possible symbols (e.g., cherry, 7, bar, etc.)

    private stopSymbols: string[][] = [];
    public funModeEnabled: boolean = false;

    onLoad() {
        this.fillReelsWithRandomStops();
        this.storeAuthFromUrl();
    }

     
    storeAuthFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const gid = urlParams.get('gid');

    if (token && gid) {
        GameApi.storeAuthData(token, gid);
        //console.log('Token and GID stored successfully');
    } else {
        //console.warn('Token or GID missing from URL');
    }
}
    private getPrefabBySymbolName(symbolKey: string): Prefab | null {
        const symbolConfig = SlotConfig.symbols[symbolKey];
        if (!symbolConfig) {
           // console.warn(`No config found for symbol key: ${symbolKey}`);
            return null;
        }

        const symbolName = symbolConfig.symbolName;
        return this.stopPrefabs.find(prefab => prefab.name === symbolName) || null;
    }

    fillReelsWithRandomStops() {
        this.reelNodes.forEach((reel, reelIndex) => {
            reel.removeAllChildren();
    
            const symbolHeight = 190;  // Uniform height for alignment
            const spacing = 15;        // Spacing between symbols
    
            for (let i = 0; i < 3; i++) { // Fill each reel with 3 symbols
                const randIndex = Math.floor(Math.random() * this.stopPrefabs.length);
                const stopNode = instantiate(this.stopPrefabs[randIndex]);
    
                // Set uniform size (optional)
                const uiTransform = stopNode.getComponent(UITransform);
                if (uiTransform) uiTransform.setContentSize(190, symbolHeight);
    
                // Position symbols manually (top-down layout)
                const yPos = (symbolHeight + spacing) * (1 - i); // Start from top (i = 0)
                stopNode.setPosition(0, yPos);
    
                reel.addChild(stopNode);
            }
        });
    }
    

    showSpinResult(result: { reels: number[][], pattern: any }) {
        this.reelNodes.forEach((reel, reelIndex) => {
            reel.removeAllChildren();
            const stops = result.reels[reelIndex];

            stops.forEach((stopIndex, stopPos) => {
                const stopNode = instantiate(this.stopPrefabs[stopIndex - 1]);
                stopNode.name = `Reel${reelIndex + 1}_Stop${stopPos + 1}`;
                reel.addChild(stopNode);
            });
        });

        // TODO: Highlight winning pattern if any
    }

    // Final result from API

    startReelSpin() {
        this.reelNodes.forEach((reel, index) => {
            this.animateReelSpin(reel);
        });
    }

    private animateReelSpin(reel: Node) {
        const symbolHeight = 190;
        const spacing = 15;
        const visibleCount = 3;
        const extraCount = 10; // buffer to scroll
        const totalSymbols = visibleCount + extraCount;

        reel.removeAllChildren();

        // Create scrollable symbol list
        for (let i = 0; i < totalSymbols; i++) {
            const randIndex = Math.floor(Math.random() * this.stopPrefabs.length);
            const stopNode = instantiate(this.stopPrefabs[randIndex]);

            const uiTransform = stopNode.getComponent(UITransform);
            if (uiTransform) {
                uiTransform.setContentSize(190, symbolHeight);
            }

            const yPos = (symbolHeight + spacing) * (totalSymbols - i - 1);
            stopNode.setPosition(0, yPos);
            reel.addChild(stopNode);
        }

        // Reset reel to start position
        reel.setPosition(new Vec3(reel.position.x, -symbolHeight - spacing, reel.position.z));

        const totalMove = (symbolHeight + spacing) * extraCount;

        const loopTween = tween(reel)
            .repeatForever(
                tween()
                    .by(0.5, { position: new Vec3(0, -totalMove, 0) })
                    .call(() => {
                        // Reset position to scroll again
                        reel.setPosition(new Vec3(reel.position.x, -symbolHeight - spacing, reel.position.z));
                    })
            );

        reel['spinTween'] = loopTween;
        loopTween.start();
    }
    
    
    
    async stopReelsWithResult(result: any) {
        this.stopSymbols = result.reels;

        for (let i = 0; i < this.reelNodes.length; i++) {
            const reel = this.reelNodes[i];

            // Wait before stopping each reel
            await this.delay(300 + i * 200);

            // Stop current reel
            this.stopReel(reel, i);

            // Play sound after the reel is triggered to stop
            AudioManager.playOnce('stoproll');
        }
    }
    

    private stopReel(reel: Node, reelIndex: number) {
        const spinTween = reel['spinTween'];
        if (spinTween) spinTween.stop();

        reel.removeAllChildren();

        const finalSymbols = this.stopSymbols[reelIndex];
        const symbolHeight = 190;
        const spacing = 15;

        finalSymbols.forEach((symbolKey: string, stopPos: number) => {
            const prefab = this.getPrefabBySymbolName(symbolKey);
            if (!prefab) return;

            const stopNode = instantiate(prefab);
            stopNode.name = `Reel${reelIndex + 1}_Stop${stopPos + 1}`;

            const uiTransform = stopNode.getComponent(UITransform);
            if (uiTransform) {
                uiTransform.setContentSize(190, symbolHeight);
            }

            stopNode.setScale(1, 1);

            // Calculate top-down y-position (center 3 symbols inside reel node)
            const yPos = (symbolHeight + spacing) * (1 - stopPos);
            stopNode.setPosition(0, yPos);

            reel.addChild(stopNode);
        });

        // Reset reel to visible area
        reel.setPosition(new Vec3(reel.position.x, 0, reel.position.z));
    }
    
    public stopAllReelsImmediately() {
        for (const reel of this.reelNodes) {
            const spinTween = reel['spinTween'];
            if (spinTween) {
                spinTween.stop();
            }
            reel.removeAllChildren();
            reel.setPosition(new Vec3(reel.position.x, 0, reel.position.z)); // reset position
        }

        // Optionally, refill reels with random stops to show idle state
        this.fillReelsWithRandomStops();
    }
    
    
    

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
