[CmdletBinding()]
param(
  [string]$ProjectName = "pokestop-mtl-astro",
  [string]$ProductionBranch = "main",
  [string]$OutputDir = "dist",
  [switch]$UseGitIntegration,
  [string]$GitRepositoryUrl = "",
  [string]$AccountId = "",
  [string]$AccountEmail = "",
  [switch]$SkipSecret,
  [switch]$SkipDeploy,
  [switch]$SkipLogin
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($PSVersionTable.PSVersion.Major -ge 7) {
  $PSNativeCommandUseErrorActionPreference = $false
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
$WranglerConfigPath = Join-Path $RepoRoot "wrangler.jsonc"
$DevVarsPath = Join-Path $RepoRoot ".dev.vars"
$BunxCommand = $null
$BunCommand = $null
$WranglerCommandPrefix = @()
$SelectedAccountId = ""
$PagesSecrets = [ordered]@{}

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Get-CompatibilityDate {
  if (-not (Test-Path $WranglerConfigPath)) {
    return (Get-Date -Format "yyyy-MM-dd")
  }

  foreach ($Line in Get-Content $WranglerConfigPath) {
    if ($Line -match '^\s*"compatibility_date"\s*:\s*"([^"]+)"') {
      return $Matches[1]
    }
  }

  return (Get-Date -Format "yyyy-MM-dd")
}

function Get-DotEnvValue {
  param(
    [string]$Path,
    [string]$Key
  )

  if (-not (Test-Path $Path)) {
    return $null
  }

  foreach ($Line in Get-Content $Path) {
    $TrimmedLine = $Line.Trim()
    if (-not $TrimmedLine -or $TrimmedLine.StartsWith("#")) {
      continue
    }

    $Parts = $TrimmedLine -split "=", 2
    if ($Parts.Count -ne 2) {
      continue
    }

    if ($Parts[0].Trim() -ne $Key) {
      continue
    }

    return $Parts[1].Trim().Trim("'").Trim('"')
  }

  return $null
}

function Get-EnvironmentValue {
  param([string]$Key)

  $Item = Get-Item -Path ("Env:" + $Key) -ErrorAction SilentlyContinue
  if ($Item) {
    return $Item.Value
  }

  return $null
}

function Test-ConfiguredSecretValue {
  param([string]$Value)

  return (
    [string]::IsNullOrWhiteSpace($Value) -eq $false -and
    $Value.Contains("replace_me") -eq $false
  )
}

function Get-ConfiguredPagesSecrets {
  $SecretNames = @(
    "PUBLIC_MEDUSA_BACKEND_URL",
    "PUBLIC_MEDUSA_PUBLISHABLE_KEY",
    "MEDUSA_ADMIN_EMAIL",
    "MEDUSA_ADMIN_PASSWORD",
    "ADMIN_SYNC_TOKEN",
    "ALLOWED_ORIGINS"
  )

  $Secrets = [ordered]@{}

  foreach ($SecretName in $SecretNames) {
    $SecretValue = Get-EnvironmentValue -Key $SecretName
    if (-not $SecretValue) {
      $SecretValue = Get-DotEnvValue -Path $DevVarsPath -Key $SecretName
    }

    if ($SecretName -eq "ALLOWED_ORIGINS") {
      if ($SecretValue) {
        $Secrets[$SecretName] = $SecretValue
      }
      continue
    }

    if (-not (Test-ConfiguredSecretValue -Value $SecretValue)) {
      throw "$SecretName is not configured. Put it in .dev.vars or set the $SecretName environment variable before running this script."
    }

    $Secrets[$SecretName] = $SecretValue
  }

  return $Secrets
}

function Format-ProcessArgument {
  param([string]$Value)

  if ($Value -notmatch '[\s"]') {
    return $Value
  }

  return '"' + $Value.Replace('"', '""') + '"'
}

function Invoke-Wrangler {
  param(
    [Parameter(Mandatory = $true)]
    [string[]]$Arguments,
    [switch]$CaptureOutput,
    [switch]$IgnoreExitCode
  )

  $StdOutFile = [System.IO.Path]::GetTempFileName()
  $StdErrFile = [System.IO.Path]::GetTempFileName()
  $ArgumentString = (($WranglerCommandPrefix + $Arguments) | ForEach-Object {
      Format-ProcessArgument $_
    }) -join " "
  $PreviousAccountId = $env:CLOUDFLARE_ACCOUNT_ID

  try {
    if ($SelectedAccountId) {
      $env:CLOUDFLARE_ACCOUNT_ID = $SelectedAccountId
    }

    $Process = Start-Process `
      -FilePath $BunCommand `
      -ArgumentList $ArgumentString `
      -WorkingDirectory $RepoRoot `
      -NoNewWindow `
      -Wait `
      -PassThru `
      -RedirectStandardOutput $StdOutFile `
      -RedirectStandardError $StdErrFile

    $StdOut = Get-Content $StdOutFile -Raw
    $StdErr = Get-Content $StdErrFile -Raw
    $ExitCode = $Process.ExitCode
  } finally {
    $env:CLOUDFLARE_ACCOUNT_ID = $PreviousAccountId
    Remove-Item $StdOutFile, $StdErrFile -Force -ErrorAction SilentlyContinue
  }

  $Output = (@($StdOut, $StdErr) | Where-Object { $_ }) -join [Environment]::NewLine

  if (-not $CaptureOutput) {
    if ($StdOut) {
      Write-Host $StdOut -NoNewline
    }

    if ($StdErr) {
      Write-Host $StdErr -ForegroundColor DarkYellow -NoNewline
    }
  }

  if (-not $IgnoreExitCode -and $ExitCode -ne 0) {
    $Message = if ($Output) { $Output.Trim() } else { "Wrangler exited with code $ExitCode." }
    throw $Message
  }

  return [pscustomobject]@{
    ExitCode = $ExitCode
    Output   = $Output.Trim()
  }
}

function Confirm-WranglerAuth {
  $WhoAmI = Invoke-Wrangler -Arguments @("whoami", "--json") -CaptureOutput -IgnoreExitCode
  if ($WhoAmI.ExitCode -eq 0) {
    Write-Step "Using existing Wrangler login session"
    return ($WhoAmI.Output | ConvertFrom-Json)
  }

  if ($SkipLogin) {
    throw "Wrangler is not authenticated. Rerun without -SkipLogin so the script can open 'wrangler login'."
  }

  Write-Step "Opening Wrangler login"
  Invoke-Wrangler -Arguments @("login") | Out-Null

  $WhoAmIAfterLogin = Invoke-Wrangler -Arguments @("whoami", "--json") -CaptureOutput -IgnoreExitCode
  if ($WhoAmIAfterLogin.ExitCode -ne 0) {
    throw "Wrangler login did not complete successfully."
  }

  return ($WhoAmIAfterLogin.Output | ConvertFrom-Json)
}

function Resolve-AccountId {
  param([object[]]$Accounts)

  if ($AccountId) {
    return $AccountId
  }

  if ($env:CLOUDFLARE_ACCOUNT_ID) {
    return $env:CLOUDFLARE_ACCOUNT_ID
  }

  if ($AccountEmail) {
    $MatchingAccounts = @($Accounts | Where-Object {
        $_.name -and $_.name.ToLowerInvariant().Contains($AccountEmail.ToLowerInvariant())
      })

    if ($MatchingAccounts.Count -eq 1) {
      return $MatchingAccounts[0].id
    }
  }

  if ($Accounts.Count -eq 1) {
    return $Accounts[0].id
  }

  throw "Multiple Cloudflare accounts detected. Rerun with -AccountId <account_id> or set CLOUDFLARE_ACCOUNT_ID."
}

Set-Location $RepoRoot

foreach ($Candidate in @("bunx.exe", "bunx")) {
  $Command = Get-Command $Candidate -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($Command) {
    $BunxCommand = $Command.Source
    break
  }
}

foreach ($Candidate in @("bun.exe", "bun")) {
  $Command = Get-Command $Candidate -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($Command) {
    $BunCommand = $Command.Source
    break
  }
}

if (-not $BunCommand) {
  throw "bun is required but was not found on PATH. Install Bun before running this script."
}

if ($BunxCommand) {
  $BunCommand = $BunxCommand
  $WranglerCommandPrefix = @("--no-install", "wrangler")
} else {
  $WranglerCommandPrefix = @("x", "--no-install", "wrangler")
}

if (-not (Test-Path $OutputDir)) {
  throw "Output directory '$OutputDir' does not exist. Run the build first."
}

$CompatibilityDate = Get-CompatibilityDate

if (-not $SkipSecret) {
  $PagesSecrets = Get-ConfiguredPagesSecrets
}

$WhoAmIResult = Confirm-WranglerAuth

if ($WhoAmIResult -and $WhoAmIResult.accounts) {
  $SelectedAccountId = Resolve-AccountId -Accounts @($WhoAmIResult.accounts)
  Write-Step "Using Cloudflare account '$SelectedAccountId'"
}

Write-Step "Ensuring Pages project '$ProjectName' exists"
$ProjectCreateResult = Invoke-Wrangler -Arguments @(
  "pages",
  "project",
  "create",
  $ProjectName,
  "--production-branch",
  $ProductionBranch,
  "--compatibility-date",
  $CompatibilityDate
) -CaptureOutput -IgnoreExitCode

if ($ProjectCreateResult.ExitCode -eq 0) {
  Write-Step "Created Pages project '$ProjectName'"
} elseif ($ProjectCreateResult.Output -match 'already exists' -or $ProjectCreateResult.Output -match '\[code:\s*8000002\]') {
  Write-Step "Pages project '$ProjectName' already exists"
} else {
  throw $ProjectCreateResult.Output
}

if (-not $SkipSecret) {
  Write-Step "Uploading Pages secrets to Pages project '$ProjectName'"
  $SecretFile = [System.IO.Path]::GetTempFileName()
  try {
    Set-Content -Path $SecretFile -Value ($PagesSecrets | ConvertTo-Json -Compress) -NoNewline
    Invoke-Wrangler -Arguments @(
      "pages",
      "secret",
      "bulk",
      $SecretFile,
      "--project-name",
      $ProjectName
    ) | Out-Null
  } finally {
    Remove-Item $SecretFile -Force -ErrorAction SilentlyContinue
  }
}

if (-not $SkipDeploy) {
  Write-Step "Deploying '$OutputDir' to Pages project '$ProjectName'"
  Invoke-Wrangler -Arguments @(
    "pages",
    "deploy",
    $OutputDir,
    "--project-name",
    $ProjectName,
    "--branch",
    $ProductionBranch
  ) | Out-Null
}

Write-Step "Cloudflare Pages setup finished"

