/**
 * DEVICE DETECTION UTILITY
 * 
 * Collect device info untuk owner lihat:
 * - Jenis device (Mobile/Tablet/Desktop)
 * - OS (Android/iOS/Windows/Mac)
 * - Browser (Chrome/Safari/Firefox)
 * - Device model
 * - Screen resolution
 */

export const getDeviceInfo = () => {
  const userAgent = navigator.userAgent;
  
  // Detect device type
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
  
  let deviceType = "Desktop";
  if (isMobile && isTablet) {
    deviceType = "Tablet";
  } else if (isMobile) {
    deviceType = "Mobile";
  }
  
  // Detect OS
  let deviceOS = "Unknown";
  if (userAgent.indexOf("Win") > -1) {
    deviceOS = "Windows";
  } else if (userAgent.indexOf("Mac") > -1) {
    deviceOS = "macOS";
  } else if (userAgent.indexOf("Linux") > -1) {
    deviceOS = "Linux";
  } else if (userAgent.indexOf("Android") > -1) {
    deviceOS = "Android";
  } else if (userAgent.indexOf("iPhone") > -1 || userAgent.indexOf("iPad") > -1) {
    deviceOS = "iOS";
  }
  
  // Add OS version if available
  let osVersion = getOSVersion(userAgent);
  if (osVersion) {
    deviceOS += ` ${osVersion}`;
  }
  
  // Detect browser
  let deviceBrowser = "Unknown";
  if (userAgent.indexOf("Chrome") > -1) {
    deviceBrowser = "Chrome";
  } else if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Chrome") === -1) {
    deviceBrowser = "Safari";
  } else if (userAgent.indexOf("Firefox") > -1) {
    deviceBrowser = "Firefox";
  } else if (userAgent.indexOf("Edge") > -1) {
    deviceBrowser = "Edge";
  }
  
  // Add browser version if available
  let browserVersion = getBrowserVersion(userAgent, deviceBrowser);
  if (browserVersion) {
    deviceBrowser += ` ${browserVersion}`;
  }
  
  // Detect device model
  let deviceModel = getDeviceModel(userAgent, deviceType);
  
  // Screen resolution
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  
  // Get current timestamp
  const scannedAt = new Date();
  
  return {
    deviceType,
    deviceOS,
    deviceBrowser,
    deviceModel,
    screenResolution,
    userAgent,
    scannedAt,
    timestamp: scannedAt.toLocaleString('id-ID'),
  };
};

// Helper: Get OS version
const getOSVersion = (userAgent) => {
  if (userAgent.indexOf("Windows NT 10.0") > -1) return "10";
  if (userAgent.indexOf("Windows NT 6.1") > -1) return "7";
  if (userAgent.indexOf("Android") > -1) {
    const match = userAgent.match(/Android (\d+\.?\d*)/);
    return match ? match[1] : "";
  }
  if (userAgent.indexOf("iPhone") > -1 || userAgent.indexOf("iPad") > -1) {
    const match = userAgent.match(/OS (\d+_\d+)/);
    return match ? match[1].replace(/_/g, ".") : "";
  }
  return "";
};

// Helper: Get browser version
const getBrowserVersion = (userAgent, browserName) => {
  let match;
  if (browserName === "Chrome") {
    match = userAgent.match(/Chrome\/(\d+)/);
  } else if (browserName === "Safari") {
    match = userAgent.match(/Version\/(\d+)/);
  } else if (browserName === "Firefox") {
    match = userAgent.match(/Firefox\/(\d+)/);
  } else if (browserName === "Edge") {
    match = userAgent.match(/Edg[e|A]\/(\d+)/);
  }
  return match ? match[1] : "";
};

// Helper: Get device model
const getDeviceModel = (userAgent, deviceType) => {
  // iPhone models
  if (userAgent.indexOf("iPhone") > -1) {
    if (userAgent.indexOf("iPhone13") > -1) return "iPhone 13";
    if (userAgent.indexOf("iPhone12") > -1) return "iPhone 12";
    if (userAgent.indexOf("iPhone11") > -1) return "iPhone 11";
    return "iPhone";
  }
  
  // iPad models
  if (userAgent.indexOf("iPad") > -1) {
    if (userAgent.indexOf("iPad Pro") > -1) return "iPad Pro";
    if (userAgent.indexOf("iPad Air") > -1) return "iPad Air";
    if (userAgent.indexOf("iPad mini") > -1) return "iPad mini";
    return "iPad";
  }
  
  // Android devices (lebih kompleks, ambil device name umum)
  if (userAgent.indexOf("Android") > -1) {
    if (userAgent.indexOf("SM-G") > -1) return "Samsung Galaxy";
    if (userAgent.indexOf("Pixel") > -1) return "Google Pixel";
    if (userAgent.indexOf("OnePlus") > -1) return "OnePlus";
    return "Android Device";
  }
  
  // Desktop
  if (deviceType === "Desktop") {
    if (userAgent.indexOf("Windows") > -1) return "Windows PC";
    if (userAgent.indexOf("Mac") > -1) return "Mac";
    if (userAgent.indexOf("Linux") > -1) return "Linux";
  }
  
  return "Unknown Device";
};

/**
 * USAGE:
 * 
 * import { getDeviceInfo } from "./utils/deviceDetection";
 * 
 * const deviceInfo = getDeviceInfo();
 * console.log(deviceInfo);
 * // Output:
 * // {
 * //   deviceType: "Mobile",
 * //   deviceOS: "Android 12",
 * //   deviceBrowser: "Chrome 98",
 * //   deviceModel: "Samsung Galaxy",
 * //   screenResolution: "1080x2340",
 * //   userAgent: "Mozilla/5.0...",
 * //   scannedAt: Date object,
 * //   timestamp: "16/03/2026, 14:30:45"
 * // }
 */