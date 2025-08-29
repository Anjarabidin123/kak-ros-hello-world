// Type declarations for Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: any): Promise<BluetoothDevice>;
    };
  }
  
  interface BluetoothDevice {
    gatt?: BluetoothRemoteGATT;
    name?: string;
    id: string;
  }
  
  interface BluetoothRemoteGATT {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): Promise<void>;
  }
  
  interface BluetoothRemoteGATTServer {
    getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
  }
  
  interface BluetoothRemoteGATTService {
    uuid: string;
    getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
  }
  
  interface BluetoothRemoteGATTCharacteristic {
    uuid: string;
    properties: {
      write: boolean;
      writeWithoutResponse: boolean;
    };
    writeValue(value: ArrayBuffer): Promise<void>;
  }
}

export class ThermalPrinter {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(): Promise<boolean> {
    try {
      console.log('🔍 Checking Bluetooth availability...');
      
      if (!navigator.bluetooth) {
        console.error('❌ Web Bluetooth API not available');
        throw new Error('Web Bluetooth tidak didukung. Aktifkan "Experimental Web Platform features" di chrome://flags');
      }

      // Check if we're on Android Chrome for better support
      const isAndroidChrome = /Android.*Chrome/.test(navigator.userAgent);
      const isHTTPS = location.protocol === 'https:';
      
      console.log('📱 User Agent:', navigator.userAgent);
      console.log('🔒 HTTPS:', isHTTPS);
      console.log('🤖 Android Chrome:', isAndroidChrome);
      
      if (!isHTTPS && location.hostname !== 'localhost') {
        throw new Error('Bluetooth memerlukan HTTPS atau localhost untuk bekerja');
      }
      
      if (isAndroidChrome) {
        console.log('✅ Android Chrome detected - using optimized settings');
      } else {
        console.warn('⚠️ Non-Android Chrome browser detected - Bluetooth support may be limited');
      }

      // More comprehensive device filters for Android compatibility
      const requestOptions = {
        acceptAllDevices: true, // Accept any Bluetooth device
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Thermal printer service
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // HM-10 module
          '0000ff00-0000-1000-8000-00805f9b34fb', // Custom service UUID
          '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
          '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
          '0000180a-0000-1000-8000-00805f9b34fb', // Device Information Service
          '00001800-0000-1000-8000-00805f9b34fb', // Generic Access Service
          '00001801-0000-1000-8000-00805f9b34fb'  // Generic Attribute Service
        ]
      };

      console.log('🔍 Scanning for ALL Bluetooth devices...');
      console.log('📋 Request options:', requestOptions);
      this.device = await navigator.bluetooth.requestDevice(requestOptions);

      if (!this.device.gatt) {
        throw new Error('GATT not available');
      }

      console.log(`Connecting to device: ${this.device.name || 'Unknown'}`);
      
      // Add connection timeout for mobile stability
      const connectionPromise = this.device.gatt!.connect();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );
      
      const server = await Promise.race([connectionPromise, timeoutPromise]) as BluetoothRemoteGATTServer;
      console.log('Connected to Bluetooth printer');

      // Get all available services
      const services = await server.getPrimaryServices();
      console.log(`Found ${services.length} services:`, services.map(s => s.uuid));

      // Try to find a writable characteristic
      for (const service of services) {
        try {
          console.log(`Checking service: ${service.uuid}`);
          const characteristics = await service.getCharacteristics();
          
          for (const char of characteristics) {
            console.log(`Characteristic: ${char.uuid}, Properties:`, {
              write: char.properties.write,
              writeWithoutResponse: char.properties.writeWithoutResponse
            });
            
            if (char.properties.write || char.properties.writeWithoutResponse) {
              this.characteristic = char;
              console.log(`✓ Using characteristic: ${char.uuid}`);
              return true;
            }
          }
        } catch (e) {
          console.warn(`Error checking service ${service.uuid}:`, e);
        }
      }

      throw new Error('Tidak ditemukan characteristic yang bisa ditulis');
    } catch (error: any) {
      console.error('Failed to connect to printer:', error);
      
      // Provide specific error messages for mobile users
      if (error.message?.includes('User cancelled')) {
        console.error('User cancelled device selection');
      } else if (error.message?.includes('Bluetooth adapter not available')) {
        console.error('Bluetooth tidak aktif di perangkat');
      } else if (error.message?.includes('not supported')) {
        console.error('Web Bluetooth tidak didukung. Buka chrome://flags dan aktifkan "Experimental Web Platform features"');
      }
      
      return false;
    }
  }

  async print(text: string): Promise<boolean> {
    if (!this.characteristic) {
      const connected = await this.connect();
      if (!connected) return false;
    }

    try {
      // ESC/POS commands for thermal printing
      const ESC = '\x1B';
      const GS = '\x1D';
      
      // Initialize printer
      let commands = ESC + '@'; // Initialize
      commands += ESC + 'a' + '\x01'; // Center align
      
      // Add the text content
      commands += text;
      
      // Cut paper and eject
      commands += '\n\n\n';
      commands += GS + 'V' + '\x42' + '\x00'; // Partial cut
      
      const encoder = new TextEncoder();
      const data = encoder.encode(commands);
      
      if (this.characteristic) {
        // Use smaller chunks for mobile stability (Android Chrome works better with smaller packets)
        const chunkSize = 20; // Smaller chunks for better mobile compatibility
        const chunks: Uint8Array[] = [];
        
        for (let i = 0; i < data.length; i += chunkSize) {
          chunks.push(data.slice(i, i + chunkSize));
        }
        
        console.log(`Sending ${data.length} bytes in ${chunks.length} chunks`);
        
        // Send each chunk with appropriate delay for mobile
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          try {
            if (this.characteristic.properties.writeWithoutResponse) {
              await this.characteristic.writeValue(chunk);
            } else {
              await this.characteristic.writeValue(chunk);
            }
            
            // Progressive delay - longer delay for mobile devices
            const delay = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 100 : 50;
            if (i < chunks.length - 1) { // Don't delay after the last chunk
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (chunkError) {
            console.error(`Error sending chunk ${i + 1}/${chunks.length}:`, chunkError);
            throw chunkError;
          }
        }
        
        console.log(`✓ Print command sent successfully in ${chunks.length} chunks`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to print:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      await this.device.gatt.disconnect();
      console.log('Disconnected from printer');
    }
    this.device = null;
    this.characteristic = null;
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected || false;
  }
}

export const thermalPrinter = new ThermalPrinter();