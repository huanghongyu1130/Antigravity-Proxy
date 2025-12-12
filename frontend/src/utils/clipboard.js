/**
 * 复制文本到剪贴板
 * 兼容非安全上下文 (HTTP)
 */
export async function copyToClipboard(text) {
  // 方法1: 使用 Clipboard API (需要 HTTPS 或 localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch (err) {
      console.warn('Clipboard API failed:', err)
    }
  }

  // 方法2: 使用传统的 execCommand 方法
  try {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const success = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (success) {
      return true
    }
  } catch (err) {
    console.error('execCommand copy failed:', err)
  }

  // 方法3: 如果都失败，显示文本让用户手动复制
  return false
}
