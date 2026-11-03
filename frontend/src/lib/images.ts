// Image URLs with a version parameter, so browsers fetch them again when
// IMAGE_VERSION changes (bump it to invalidate every cached image).

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
