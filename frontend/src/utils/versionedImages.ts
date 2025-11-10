/**
 * Add version parameter to image URLs for cache busting
 * Update the VERSION constant when you want to invalidate all image caches
 */

// Update this version when you want to bust the cache for all images
const IMAGE_VERSION = "1.0.0";

/**
 * Get a versioned image URL for cache busting
 * @param imagePath - Path to the image (e.g., "/college_flags/yale.png")
 * @param version - Optional specific version (defaults to IMAGE_VERSION)
 * @returns Versioned image URL
 */
export function getVersionedImage(imagePath: string, version?: string): string {
  const versionParam = version || IMAGE_VERSION;
  const separator = imagePath.includes("?") ? "&" : "?";
  return `${imagePath}${separator}v=${versionParam}`;
}

/**
 * Get versioned URL for college flag
 */
export function getCollegeFlag(collegeName: string, version?: string): string {
  return getVersionedImage(`/college_flags/${collegeName}.png`, version);
}

/**
 * Get versioned URL for MVP image
 */
export function getMVPImage(imageName: string, version?: string): string {
  return getVersionedImage(`/mvp_images/${imageName}`, version);
}

/**
 * Get versioned URL for dev image
 */
export function getDevImage(imageName: string, version?: string): string {
  return getVersionedImage(`/dev_images/${imageName}`, version);
}

/**
 * Get versioned URL for loader animation
 */
export function getLoaderAnimation(animationName: string, version?: string): string {
  return getVersionedImage(`/loader_animations/${animationName}`, version);
}

// You can also read version from package.json if you prefer
// import packageJson from '../../package.json';
// const IMAGE_VERSION = packageJson.version;
