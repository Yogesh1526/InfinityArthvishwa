import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Subject, Observable, interval, Subscription } from 'rxjs';
import { WebcamImage, WebcamInitError, WebcamUtil } from 'ngx-webcam';
import { MatDialogRef } from '@angular/material/dialog';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface LivenessCheck {
  hasFace: boolean;
  faceCount: number;
  isLive: boolean;
  message: string;
  canCapture: boolean;
}

@Component({
  selector: 'app-webcam',
  templateUrl: './webcam.component.html',
  styleUrls: ['./webcam.component.css']
})
export class WebcamComponent implements OnInit, OnDestroy {
  public showWebcam = true;
  public multipleWebcamsAvailable = false;

  private trigger: Subject<void> = new Subject<void>();
  private nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();

  public isPreview = false;
  public capturedImage: WebcamImage | null = null;
  public uploadedImageDataUrl: string | null = null;

  // Camera selection
  public availableCameras: CameraDevice[] = [];
  public selectedCameraId: string = '';
  public currentCameraIndex: number = 0;

  // Liveness detection
  public livenessEnabled = true;
  public livenessCheck: LivenessCheck = {
    hasFace: false,
    faceCount: 0,
    isLive: false,
    message: 'Initializing face detection...',
    canCapture: false
  };
  public isCheckingLiveness = false;
  private livenessSubscription: Subscription | null = null;
  private faceDetectionSupported = false;

  // Movement tracking for liveness
  private previousFacePosition: { x: number; y: number } | null = null;
  private movementCount = 0;
  private readonly MOVEMENT_THRESHOLD = 15; // pixels
  private readonly REQUIRED_MOVEMENTS = 2; // movements needed to confirm liveness

  // Blink detection
  private blinkDetected = false;
  private eyeAspectRatioHistory: number[] = [];
  private readonly BLINK_THRESHOLD = 0.2;

  constructor(private dialogRef: MatDialogRef<WebcamComponent>) {}

  ngOnInit(): void {
    this.loadAvailableCameras();
    this.initializeFaceDetection();
  }

  ngOnDestroy(): void {
    this.stopLivenessCheck();
  }

  /**
   * Initialize face detection using browser's FaceDetector API (if available)
   * Falls back to basic validation if not supported
   */
  async initializeFaceDetection(): Promise<void> {
    // Check if FaceDetector API is available (Chrome 94+)
    if ('FaceDetector' in window) {
      this.faceDetectionSupported = true;
      this.livenessCheck.message = 'Face detection ready. Please position your face in the frame.';
      this.startLivenessCheck();
    } else {
      // Fallback - basic validation without face detection
      this.faceDetectionSupported = false;
      this.livenessCheck = {
        hasFace: true,
        faceCount: 1,
        isLive: true,
        message: 'Face detection not supported in this browser. Please ensure only one person is visible.',
        canCapture: true
      };
    }
  }

  /**
   * Start continuous liveness checking
   */
  startLivenessCheck(): void {
    if (!this.faceDetectionSupported || this.livenessSubscription) return;

    this.livenessSubscription = interval(500).subscribe(() => {
      this.performLivenessCheck();
    });
  }

  /**
   * Stop liveness checking
   */
  stopLivenessCheck(): void {
    if (this.livenessSubscription) {
      this.livenessSubscription.unsubscribe();
      this.livenessSubscription = null;
    }
  }

  /**
   * Perform face detection and liveness check
   */
  async performLivenessCheck(): Promise<void> {
    if (this.isPreview || this.isCheckingLiveness) return;

    try {
      this.isCheckingLiveness = true;

      // Get video element from webcam
      const videoElement = document.querySelector('webcam video') as HTMLVideoElement;
      if (!videoElement || videoElement.readyState < 2) {
        this.livenessCheck.message = 'Waiting for camera...';
        return;
      }

      // Use browser's FaceDetector API
      const faceDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      const faces = await faceDetector.detect(videoElement);

      this.livenessCheck.faceCount = faces.length;

      if (faces.length === 0) {
        this.livenessCheck = {
          hasFace: false,
          faceCount: 0,
          isLive: false,
          message: '❌ No face detected. Please position your face in the frame.',
          canCapture: false
        };
        this.resetMovementTracking();
      } else if (faces.length > 1) {
        this.livenessCheck = {
          hasFace: true,
          faceCount: faces.length,
          isLive: false,
          message: `❌ Multiple faces detected (${faces.length}). Only one person allowed.`,
          canCapture: false
        };
        this.resetMovementTracking();
      } else {
        // Single face detected - check for liveness
        const face = faces[0];
        const faceBox = face.boundingBox;
        const currentPosition = {
          x: faceBox.x + faceBox.width / 2,
          y: faceBox.y + faceBox.height / 2
        };

        // Check for movement (liveness indicator)
        if (this.previousFacePosition) {
          const distance = Math.sqrt(
            Math.pow(currentPosition.x - this.previousFacePosition.x, 2) +
            Math.pow(currentPosition.y - this.previousFacePosition.y, 2)
          );

          if (distance > this.MOVEMENT_THRESHOLD) {
            this.movementCount++;
          }
        }
        this.previousFacePosition = currentPosition;

        // Determine liveness based on movement
        const isLive = this.movementCount >= this.REQUIRED_MOVEMENTS;

        if (isLive) {
          this.livenessCheck = {
            hasFace: true,
            faceCount: 1,
            isLive: true,
            message: '✅ Face verified! You can capture now.',
            canCapture: true
          };
        } else {
          const remainingMovements = this.REQUIRED_MOVEMENTS - this.movementCount;
          this.livenessCheck = {
            hasFace: true,
            faceCount: 1,
            isLive: false,
            message: `🔄 Please move your head slightly (${remainingMovements} more movement${remainingMovements > 1 ? 's' : ''} needed)`,
            canCapture: false
          };
        }
      }
    } catch (error) {
      console.error('Face detection error:', error);
      // Allow capture on error but show warning
      this.livenessCheck = {
        hasFace: true,
        faceCount: 1,
        isLive: true,
        message: '⚠️ Face detection unavailable. Please ensure only one person is visible.',
        canCapture: true
      };
    } finally {
      this.isCheckingLiveness = false;
    }
  }

  /**
   * Reset movement tracking
   */
  resetMovementTracking(): void {
    this.previousFacePosition = null;
    this.movementCount = 0;
  }

  /**
   * Toggle liveness detection
   */
  toggleLiveness(): void {
    this.livenessEnabled = !this.livenessEnabled;
    if (this.livenessEnabled && this.faceDetectionSupported) {
      this.startLivenessCheck();
    } else {
      this.stopLivenessCheck();
      this.livenessCheck = {
        hasFace: true,
        faceCount: 1,
        isLive: true,
        message: 'Liveness detection disabled',
        canCapture: true
      };
    }
  }

  /**
   * Load all available camera devices
   */
  async loadAvailableCameras(): Promise<void> {
    try {
      // First request camera permission to get device labels
      await navigator.mediaDevices.getUserMedia({ video: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      this.availableCameras = videoDevices.map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${index + 1}`
      }));
      
      this.multipleWebcamsAvailable = this.availableCameras.length > 1;
      
      // Set the first camera as selected by default
      if (this.availableCameras.length > 0) {
        this.selectedCameraId = this.availableCameras[0].deviceId;
        this.currentCameraIndex = 0;
      }
    } catch (error) {
      console.error('Error loading cameras:', error);
      // Fallback to WebcamUtil
      WebcamUtil.getAvailableVideoInputs().then((mediaDevices) => {
        this.availableCameras = mediaDevices.map((device, index) => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${index + 1}`
        }));
        this.multipleWebcamsAvailable = this.availableCameras.length > 1;
        if (this.availableCameras.length > 0) {
          this.selectedCameraId = this.availableCameras[0].deviceId;
        }
      });
    }
  }

  /**
   * Get current camera name
   */
  get currentCameraName(): string {
    const camera = this.availableCameras.find(c => c.deviceId === this.selectedCameraId);
    return camera?.label || 'Default Camera';
  }

  // Getters for template binding
  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean | string> {
    return this.nextWebcam.asObservable();
  }

  public triggerSnapshot(): void {
    // Check if capture is allowed based on liveness
    if (this.livenessEnabled && !this.livenessCheck.canCapture) {
      return; // Don't capture if liveness check fails
    }
    this.trigger.next();
  }

  /**
   * Flip/Switch to next camera in the list
   */
  public switchCamera(): void {
    if (this.availableCameras.length <= 1) return;
    
    // Move to next camera in list
    this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
    const nextCamera = this.availableCameras[this.currentCameraIndex];
    this.selectedCameraId = nextCamera.deviceId;
    
    // Reset liveness tracking when switching cameras
    this.resetMovementTracking();
    
    // Emit the device ID to switch camera
    this.nextWebcam.next(nextCamera.deviceId);
  }

  /**
   * Select a specific camera from dropdown
   */
  public selectCamera(deviceId: string): void {
    if (deviceId === this.selectedCameraId) return;
    
    this.selectedCameraId = deviceId;
    this.currentCameraIndex = this.availableCameras.findIndex(c => c.deviceId === deviceId);
    
    // Reset liveness tracking when switching cameras
    this.resetMovementTracking();
    
    // Emit the device ID to switch camera
    this.nextWebcam.next(deviceId);
  }

  public handleImage(image: WebcamImage): void {
    this.capturedImage = image;
    this.isPreview = true;
    this.stopLivenessCheck(); // Stop checking when previewing
  }

  public handleInitError(error: WebcamInitError): void {
    console.error('Webcam init error:', error);
  }

  public cancel(): void {
    this.dialogRef.close(null);
  }

  public handleFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        this.uploadedImageDataUrl = reader.result as string;
        this.isPreview = true;
      };

      reader.readAsDataURL(file);
    }
  }

  public confirmPhoto(): void {
    if (this.capturedImage) {
      this.dialogRef.close(this.capturedImage.imageAsDataUrl);
    } else if (this.uploadedImageDataUrl) {
      this.dialogRef.close(this.uploadedImageDataUrl);
    }
  }

  public retakePhoto(): void {
    this.isPreview = false;
    this.capturedImage = null;
    this.uploadedImageDataUrl = null;
    
    // Restart liveness checking
    this.resetMovementTracking();
    if (this.livenessEnabled && this.faceDetectionSupported) {
      this.startLivenessCheck();
    }
  }

  /**
   * Check if capture button should be disabled
   */
  get isCaptureDisabled(): boolean {
    return this.livenessEnabled && !this.livenessCheck.canCapture;
  }
}
