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
    
    // Object pool for symbol nodes to improve performance
    private symbolPool: Map<string, Node[]> = new Map();
    private readonly maxPoolSize = 20; // Maximum nodes per symbol type to keep in pool

    onLoad() {
        this.initializeSymbolPool();
        this.fillReelsWithRandomStops();
        this.storeAuthFromUrl();
    }

    /**
     * Initialize the object pool for symbol nodes
     */
    private initializeSymbolPool() {
        this.stopPrefabs.forEach(prefab => {
            this.symbolPool.set(prefab.name, []);
        });
    }

    /**
     * Get a symbol node from pool or create new one
     */
    private getSymbolFromPool(prefabName: string): Node | null {
        const prefab = this.stopPrefabs.find(p => p.name === prefabName);
        if (!prefab) return null;

        const pool = this.symbolPool.get(prefabName);
        if (pool && pool.length > 0) {
            const node = pool.pop();
            node.active = true;
            return node;
        }

        // Create new node if pool is empty
        return instantiate(prefab);
    }

    /**
     * Return a symbol node to the pool for reuse
     */
    private returnSymbolToPool(node: Node, prefabName: string) {
        if (!node) return;

        const pool = this.symbolPool.get(prefabName);
        if (pool && pool.length < this.maxPoolSize) {
            node.active = false;
            node.removeFromParent();
            pool.push(node);
        } else {
            // Pool is full, destroy the node
            node.destroy();
        }
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
            // Return existing symbols to the pool before clearing
            reel.children.forEach(child => {
                const prefabName = this.getPrefabNameFromNode(child);
                if (prefabName) {
                    this.returnSymbolToPool(child, prefabName);
                }
            });
            reel.removeAllChildren();
    
            const symbolHeight = 190;  // Uniform height for alignment
            const spacing = 15;        // Spacing between symbols
    
            for (let i = 0; i < 3; i++) { // Fill each reel with 3 symbols
                const randIndex = Math.floor(Math.random() * this.stopPrefabs.length);
                const prefabName = this.stopPrefabs[randIndex].name;
                const stopNode = this.getSymbolFromPool(prefabName);
                
                if (!stopNode) continue;
    
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

    /**
     * Helper method to get prefab name from a node (for pool management)
     */
    private getPrefabNameFromNode(node: Node): string | null {
        // Try to match node against known prefab names
        for (const prefab of this.stopPrefabs) {
            if (node.name.includes(prefab.name) || node._prefab === prefab) {
                return prefab.name;
            }
        }
        return null;
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

        // Return existing symbols to pool before clearing
        reel.children.forEach(child => {
            const prefabName = this.getPrefabNameFromNode(child);
            if (prefabName) {
                this.returnSymbolToPool(child, prefabName);
            }
        });
        reel.removeAllChildren();

        // Create scrollable symbol list using object pool
        for (let i = 0; i < totalSymbols; i++) {
            const randIndex = Math.floor(Math.random() * this.stopPrefabs.length);
            const prefabName = this.stopPrefabs[randIndex].name;
            const stopNode = this.getSymbolFromPool(prefabName);

            if (!stopNode) continue;

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

        // Return existing symbols to pool before clearing
        reel.children.forEach(child => {
            const prefabName = this.getPrefabNameFromNode(child);
            if (prefabName) {
                this.returnSymbolToPool(child, prefabName);
            }
        });
        reel.removeAllChildren();

        const finalSymbols = this.stopSymbols[reelIndex];
        const symbolHeight = 190;
        const spacing = 15;

        finalSymbols.forEach((symbolKey: string, stopPos: number) => {
            const prefab = this.getPrefabBySymbolName(symbolKey);
            if (!prefab) return;

            const stopNode = this.getSymbolFromPool(prefab.name);
            if (!stopNode) return;

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
            
            // Return existing symbols to pool before clearing
            reel.children.forEach(child => {
                const prefabName = this.getPrefabNameFromNode(child);
                if (prefabName) {
                    this.returnSymbolToPool(child, prefabName);
                }
            });
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
