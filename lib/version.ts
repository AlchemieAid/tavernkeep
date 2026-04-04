import { execSync } from 'child_process'

export function getVersion(): string {
  try {
    // Get the total number of commits
    const commitCount = execSync('git rev-list --count HEAD')
      .toString()
      .trim()
    
    // Get the short commit hash
    const commitHash = execSync('git rev-parse --short HEAD')
      .toString()
      .trim()
    
    return `v1.0.${commitCount}-${commitHash}`
  } catch (error) {
    // Fallback if git is not available
    return 'v1.0.0'
  }
}
