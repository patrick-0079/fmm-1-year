$ErrorActionPreference = 'Stop'
$cargo = Get-Command cargo -ErrorAction SilentlyContinue
if (-not $cargo) { $cargo = Get-Command "$HOME/.cargo/bin/cargo.exe" }
Push-Location $PSScriptRoot
try {
    node art.mjs
    if ($LASTEXITCODE) { throw 'Artwork build failed.' }
    & $cargo.Source test --locked
    if ($LASTEXITCODE) { throw 'Native tests failed.' }
    & $cargo.Source build --release --locked
    if ($LASTEXITCODE) { throw 'Native build failed.' }
    $destination = Join-Path $PSScriptRoot 'target/fufu-pet-windows.zip'
    Compress-Archive -LiteralPath 'target/release/fufu-pet.exe', 'README.md' -DestinationPath $destination -Force
    Write-Output $destination
} finally { Pop-Location }
