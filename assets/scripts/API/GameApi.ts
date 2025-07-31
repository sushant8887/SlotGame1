import { director, sys } from 'cc';
import { Popup } from '../Popup';

export class GameApi {
    private static baseUrl = 'https://game-api.egamesplay.com/api';

    private static popup: Popup = null;

    static setPopup(popup: Popup) {
        this.popup = popup;
    }

    static getAuthHeaders() {
        const token = sys.localStorage.getItem('auth_token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    static async getPlayerDetails(): Promise<any> {
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
            sys.localStorage.setItem('player_details', JSON.stringify(data));
            return data;
        } catch (error) {
            console.error('Error fetching player details:', error);
            this.popup?.show('Unable to fetch player data. Please try again.');
            return null;
        }
    }
    
    

    static async getGameConfig(gid: string): Promise<any> {
        const res = await fetch(`${this.baseUrl}/game/config/${gid}`, {
            method: 'GET',
            headers: this.getAuthHeaders()
        });
        const config = await res.json();
        sys.localStorage.setItem('game_config', JSON.stringify(config));
        return config;
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