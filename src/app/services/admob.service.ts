import { Injectable } from '@angular/core';
import {
  AdMob,
  BannerAdOptions,
  BannerAdSize,
  BannerAdPosition,
} from '@capacitor-community/admob';

@Injectable({
  providedIn: 'root',
})
export class AdmobService {
  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      await AdMob.initialize({
        initializeForTesting: false,
      });
      console.log('AdMob initialized');
    } catch (error) {
      console.error('AdMob initialization error:', error);
    }
  }

  public async showBannerAd() {
    const adOptions: BannerAdOptions = {
      adId: 'ca-app-pub-3572351839702637/4578373095', // Replace with your ad unit ID
      adSize: BannerAdSize.BANNER,
      position: BannerAdPosition.BOTTOM_CENTER, // Correct position type
      margin: 0,
      isTesting: true, // Set to true for testing purposes
    };

    try {
      await AdMob.showBanner(adOptions);
      console.log('Banner ad shown');
    } catch (error) {
      console.error('Error showing banner ad:', error);
    }
  }

  public async hideBannerAd() {
    try {
      await AdMob.hideBanner();
      console.log('Banner ad hidden');
    } catch (error) {
      console.error('Error hiding banner ad:', error);
    }
  }
}
