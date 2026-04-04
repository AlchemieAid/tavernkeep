export function getVersion(): string {
  // Use Vercel's built-in environment variables
  const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev'
  const commitRef = process.env.VERCEL_GIT_COMMIT_REF || 'local'
  
  // For production builds, show commit hash
  if (process.env.VERCEL_ENV === 'production') {
    return `v1.0-${commitSha}`
  }
  
  // For preview/development
  return `v1.0-${commitRef}-${commitSha}`
}
