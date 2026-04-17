import exifr from 'exifr';
import { ImageProcessor } from './imageProcessor';

export interface LocationData {
  latitude?: number;
  longitude?: number;
  altitude?: number;
  timestamp?: Date;
}

export class LocationService {
  private imageProcessor: ImageProcessor;

  constructor() {
    this.imageProcessor = new ImageProcessor();
  }

  async extractFromImage(base64Image: string): Promise<LocationData> {
    try {
      const buffer = this.imageProcessor.decodeBase64(base64Image);

      const exif = await exifr.parse(buffer, {
        gps: true,
        pick: ['GPSLatitude', 'GPSLongitude', 'GPSAltitude', 'DateTimeOriginal'],
      });

      if (!exif) {
        return {};
      }

      return {
        latitude: exif.latitude,
        longitude: exif.longitude,
        altitude: exif.GPSAltitude,
        timestamp: exif.DateTimeOriginal,
      };
    } catch (error) {
      // EXIF extraction failed, return empty location
      return {};
    }
  }

  async getLocationFromCoordinates(lat: number, lon: number): Promise<string | null> {
    // For now, return a basic description
    // In production, this could call a reverse geocoding API
    if (lat >= 8 && lat <= 37 && lon >= 68 && lon <= 97) {
      return 'India';
    }
    return null;
  }
}
