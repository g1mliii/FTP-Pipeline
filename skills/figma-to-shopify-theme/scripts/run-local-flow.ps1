$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Push-Location $repoRoot
try {
  npm install
  npx playwright install chromium
  npm run flow
}
finally {
  Pop-Location
}
