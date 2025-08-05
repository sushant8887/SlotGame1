import { director, sys } from 'cc';
import { Popup } from '../Popup';

export class GameApi {
    private static baseUrl = 'https://game-api.egamesplay.com/api';

    private static popup: Popup = null;

    // Cache configuration - 5 minutes TTL for config data, 30 seconds for player data
    private static cache = new Map<string, { data: any, timestamp: number, ttl: number }>();
    private static readonly CONFIG_TTL = 5 * 60 * 1000; // 5 minutes
    private static readonly PLAYER_TTL = 30 * 1000; // 30 seconds

    static setPopup(popup: Popup) {
        this.popup = popup;
    }

    private static getCachedData(key: string): any | null {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return entry.data;
    }

    private static setCachedData(key: string, data: any, ttl: number): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl
        });
    }

    static getAuthHeaders() {
        const token = sys.localStorage.getItem('auth_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    static async getPlayerDetails(): Promise<any> {
        const cacheKey = 'player_details';
        
        // Check cache first
        const cachedData = this.getCachedData(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            const res = await fetch(`${this.baseUrl}/player/detail`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });

            if (res.status === 403) {
                this.popup?.show('Session expired. Please login again.');
                return null;
            }

            const data = await res.json();
            
            // Cache the response and also store in localStorage for offline fallback
            this.setCachedData(cacheKey, data, this.PLAYER_TTL);
            sys.localStorage.setItem('player_details', JSON.stringify(data));
            
            return data;
        } catch (error) {
            console.error('Error fetching player details:', error);
            this.popup?.show('Unable to fetch player data. Please try again.');
            
            // Try to return cached localStorage data as fallback
            try {
                const fallbackData = sys.localStorage.getItem('player_details');
                return fallbackData ? JSON.parse(fallbackData) : null;
            } catch {
                return null;
            }
        }
    }
    
    

    static async getGameConfig(gid: string): Promise<any> {
        const cacheKey = `game_config_${gid}`;
        
        // Check cache first
        const cachedData = this.getCachedData(cacheKey);
        if (cachedData) {
            return cachedData;
        }

        try {
            const res = await fetch(`${this.baseUrl}/game/config/${gid}`, {
                method: 'GET',
                headers: this.getAuthHeaders()
            });
            
            const config = await res.json();
            
            // Cache the response and also store in localStorage for offline fallback
            this.setCachedData(cacheKey, config, this.CONFIG_TTL);
            sys.localStorage.setItem('game_config', JSON.stringify(config));
            
            return config;
        } catch (error) {
            console.error('Error fetching game config:', error);
            
            // Try to return cached localStorage data as fallback
            try {
                const fallbackData = sys.localStorage.getItem('game_config');
                return fallbackData ? JSON.parse(fallbackData) : null;
            } catch {
                throw error;
            }
        }
    }

    static async spin(bet: number, lines: number, freeSpins: number = 0): Promise<any> {
        const gid = sys.localStorage.getItem('gid');
        const res = await fetch(`${this.baseUrl}/reel/spin`, {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ bet, lines, gid, freeSpins })
        });
        return await res.json();
    }

    static storeAuthData(token: string, gid: string) {
        sys.localStorage.setItem('auth_token', token);
        sys.localStorage.setItem('gid', gid);
    }
  }