/**
 * WebRTC Logger & Diagnostics
 * Provides detailed logging for debugging cross-browser WebRTC issues
 */

export const WebRTCLogger = {
  // Log levels
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,

  level: 0, // Set to DEBUG in development

  /**
   * Format log message with context
   */
  format(module, action, details = {}) {
    const timestamp = new Date().toISOString();
    return {
      timestamp,
      module,
      action,
      details,
      userAgent: navigator.userAgent,
    };
  },

  /**
   * Debug: Detailed information for developers
   */
  debug(module, action, details = {}) {
    if (this.level <= this.DEBUG) {
      const log = this.format(module, action, details);
      console.debug(`[WebRTC:${module}:${action}]`, log);
    }
  },

  /**
   * Info: General informational messages
   */
  info(module, action, details = {}) {
    if (this.level <= this.INFO) {
      const log = this.format(module, action, details);
      console.info(`[WebRTC:${module}:${action}]`, log);
    }
  },

  /**
   * Warning: Warning messages for potential issues
   */
  warn(module, action, details = {}) {
    if (this.level <= this.WARN) {
      const log = this.format(module, action, details);
      console.warn(`[WebRTC:${module}:${action}]`, log);
    }
  },

  /**
   * Error: Error messages
   */
  error(module, action, error, details = {}) {
    if (this.level <= this.ERROR) {
      const errorObj = {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
        ...details,
      };
      const log = this.format(module, action, errorObj);
      console.error(`[WebRTC:${module}:${action}]`, log);
    }
  },

  /**
   * Log peer connection stats
   */
  logPeerStats(peerId, stats) {
    this.debug('PeerConnection', 'Stats', {
      peerId,
      stats,
    });
  },

  /**
   * Log ICE candidate
   */
  logIceCandidate(peerId, candidate, type = 'local') {
    this.debug('ICE', `Candidate:${type}`, {
      peerId,
      candidate: candidate?.candidate || 'empty',
      sdpMLineIndex: candidate?.sdpMLineIndex,
      sdpMid: candidate?.sdpMid,
    });
  },

  /**
   * Log connection state change
   */
  logConnectionState(peerId, newState, oldState) {
    this.info('PeerConnection', 'StateChange', {
      peerId,
      from: oldState,
      to: newState,
    });
  },
};

/**
 * Browser Detection & Compatibility Layer
 */
export const BrowserCompat = {
  /**
   * Detect browser type
   */
  getBrowserType() {
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Chromium')) return 'Chrome';
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
    return 'Unknown';
  },

  /**
   * Get platform type
   */
  getPlatformType() {
    const ua = navigator.userAgent;
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    return 'Unknown';
  },

  /**
   * Check WebRTC capabilities
   */
  checkWebRTCCapabilities() {
    const browser = this.getBrowserType();
    const capabilities = {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      RTCPeerConnection: !!window.RTCPeerConnection,
      RTCSessionDescription: !!window.RTCSessionDescription,
      RTCIceCandidate: !!window.RTCIceCandidate,
      supported: true,
    };

    if (!capabilities.getUserMedia || !capabilities.RTCPeerConnection) {
      capabilities.supported = false;
      WebRTCLogger.warn('BrowserCompat', 'UnsupportedBrowser', {
        browser,
        capabilities,
      });
    }

    return capabilities;
  },

  /**
   * Get RTCConfiguration with best practices
   */
  getRTCConfiguration() {
    const config = {
      iceServers: this.getIceServers(),
      iceTransportPolicy: 'all', // 'all' or 'relay' for privacy
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    };

    WebRTCLogger.debug('BrowserCompat', 'RTCConfiguration', config);
    return config;
  },

  /**
   * Get optimized ICE servers
   */
  getIceServers() {
    return [
      // Google STUN servers
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      { urls: ['stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302'] },
      { urls: ['stun:stun4.l.google.com:19302'] },

      // Fallback STUN servers
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.services.mozilla.com:3478' },

      // TURN servers (if needed for NAT traversal)
      // Note: Add real TURN servers for production
      // Example:
      // {
      //   urls: 'turn:turnserver.example.com:3478',
      //   username: 'username',
      //   credential: 'password',
      // },
    ];
  },

  /**
   * Get device-optimized media constraints
   */
  getMediaConstraints(needsVideo) {
    const platform = this.getPlatformType();
    const browser = this.getBrowserType();
    
    // Base audio constraints
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    };

    // Base video constraints
    const videoConstraints = {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      frameRate: { ideal: 30 },
    };

    // iOS Safari: More restrictive constraints required
    if ((platform === 'iOS' || platform === 'Android') && browser === 'Safari') {
      WebRTCLogger.debug('BrowserCompat', 'UsingMobileConstraints', {
        platform,
        browser,
      });
      return {
        audio: audioConstraints,
        video: needsVideo
          ? {
              width: { ideal: 640 },
              height: { ideal: 480 },
              frameRate: { ideal: 15 },
            }
          : false,
      };
    }

    // Android Chrome: Relaxed constraints
    if (platform === 'Android' && browser === 'Chrome') {
      return {
        audio: audioConstraints,
        video: needsVideo
          ? {
              width: { ideal: 1024 },
              height: { ideal: 768 },
              frameRate: { ideal: 24 },
            }
          : false,
      };
    }

    // Desktop: Full HD constraints
    return {
      audio: audioConstraints,
      video: needsVideo ? videoConstraints : false,
    };
  },
};

/**
 * WebRTC Error Handler
 */
export const WebRTCErrorHandler = {
  /**
   * Handle getUserMedia errors
   */
  handleMediaError(error) {
    let message = 'Unable to access media devices';
    let userMessage = 'Unable to access your camera/microphone';

    if (error.name === 'NotAllowedError') {
      message = 'User denied permission to access media devices';
      userMessage = 'Please allow camera/microphone access';
    } else if (error.name === 'NotFoundError') {
      message = 'No media devices found';
      userMessage = 'No camera or microphone detected';
    } else if (error.name === 'NotReadableError') {
      message = 'Media devices are in use by another application';
      userMessage = 'Camera/microphone is being used by another app';
    } else if (error.name === 'SecurityError') {
      message = 'Cross-origin access denied';
      userMessage = 'Security policy prevents camera/microphone access';
    } else if (error.name === 'OverconstrainedError') {
      message = 'Camera/microphone does not support requested constraints';
      userMessage = 'Your device does not support required video/audio settings';
    } else if (error.name === 'TypeError') {
      message = 'Invalid constraints';
      userMessage = 'Camera/microphone constraints are invalid';
    }

    WebRTCLogger.error('MediaDevices', 'getUserMedia', error, {
      shortMessage: message,
      userMessage,
    });

    return { message, userMessage };
  },

  /**
   * Handle ICE connection errors
   */
  getIceConnectionStateString(state) {
    const stateMap = {
      new: 'Connection newly created',
      checking: 'Checking connectivity...',
      connected: 'Connected',
      completed: 'Connection completed',
      failed: 'Connection failed',
      disconnected: 'Disconnected',
      closed: 'Connection closed',
    };
    return stateMap[state] || state;
  },

  /**
   * Handle connection state errors
   */
  getConnectionStateString(state) {
    const stateMap = {
      new: 'Connection newly created',
      connecting: 'Connecting...',
      connected: 'Connected',
      disconnected: 'Disconnected',
      failed: 'Connection failed',
      closed: 'Connection closed',
    };
    return stateMap[state] || state;
  },

  /**
   * Check if error is recoverable
   */
  isRecoverable(error) {
    const unrecoverableErrors = ['NotAllowedError', 'SecurityError'];
    return !unrecoverableErrors.includes(error?.name);
  },
};

/**
 * Retry Manager for failed operations
 */
export const RetryManager = {
  /**
   * Retry async operation with exponential backoff
   */
  async executeWithRetry(operation, options = {}) {
    const {
      maxAttempts = 3,
      initialDelayMs = 500,
      maxDelayMs = 5000,
      backoffMultiplier = 2,
      label = 'Operation',
    } = options;

    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        WebRTCLogger.debug('RetryManager', `Attempt${attempt}`, { label });
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt === maxAttempts) break;

        const delayMs = Math.min(
          initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
          maxDelayMs
        );
        WebRTCLogger.warn('RetryManager', 'RetryAfterDelay', {
          label,
          attempt,
          nextDelayMs: delayMs,
          error: error?.message,
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    WebRTCLogger.error('RetryManager', 'FailedAfterRetries', lastError, {
      label,
      attempts: maxAttempts,
    });
    throw lastError;
  },
};

export default {
  WebRTCLogger,
  BrowserCompat,
  WebRTCErrorHandler,
  RetryManager,
};
