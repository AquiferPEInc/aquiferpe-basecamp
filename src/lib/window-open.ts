/**
 * Opens a URL in a new browser window with specified dimensions
 * @param url - The URL to open
 * @param width - Window width in pixels (default: 1200)
 * @param height - Window height in pixels (default: 800)
 */
export const openInWindow = (url: string, width: number = 1200, height: number = 800) => {
  // Calculate center position
  const left = window.screenX + (window.outerWidth - width) / 2
  const top = window.screenY + (window.outerHeight - height) / 2

  window.open(
    url,
    '_blank',
    `width=${width},height=${height},left=${left},top=${top},toolbar=yes,location=yes,status=yes,menubar=yes,scrollbars=yes,resizable=yes`
  )
}
