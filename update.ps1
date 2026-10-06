param([string]$TargetDirectory)
$ErrorActionPreference = 'Stop'
$cocosSourceDirectory = Join-Path $PSScriptRoot 'extension'
$cocosMetadataPath = Join-Path $PSScriptRoot 'update-files.json'
$cocosRememberedPath = Join-Path $PSScriptRoot 'update-target.json'
if (-not (Test-Path -LiteralPath $cocosMetadataPath -PathType Leaf)) { throw 'Extract the entire package first; update-files.json is missing.' }
$cocosMetadata = Get-Content -LiteralPath $cocosMetadataPath -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $TargetDirectory -and (Test-Path -LiteralPath $cocosRememberedPath -PathType Leaf)) {
    $TargetDirectory = (Get-Content -LiteralPath $cocosRememberedPath -Raw -Encoding UTF8 | ConvertFrom-Json).targetDirectory
}
if (-not $TargetDirectory) {
    Add-Type -AssemblyName System.Windows.Forms
    $cocosPicker = New-Object System.Windows.Forms.FolderBrowserDialog
    $cocosPicker.Description = 'Select the EXISTING Cocos Web Translator extension folder containing manifest.json.'
    $cocosPicker.ShowNewFolderButton = $false
    try { if ($cocosPicker.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { throw 'Update cancelled.' }; $TargetDirectory = $cocosPicker.SelectedPath }
    finally { $cocosPicker.Dispose() }
}
$cocosTargetRoot = (Resolve-Path -LiteralPath $TargetDirectory).ProviderPath.TrimEnd('\')
$cocosSourceRoot = (Resolve-Path -LiteralPath $cocosSourceDirectory).ProviderPath.TrimEnd('\')
$cocosTargetManifestPath = Join-Path $cocosTargetRoot 'manifest.json'
if (-not (Test-Path -LiteralPath $cocosTargetManifestPath -PathType Leaf)) { throw 'Select the existing installed extension folder, not an empty/new folder.' }
$cocosPreviousManifest = Get-Content -LiteralPath $cocosTargetManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($cocosPreviousManifest.background.service_worker -ne 'background.mjs' -or
    $cocosPreviousManifest.options_ui.page -ne 'options.html' -or
    -not (Test-Path -LiteralPath (Join-Path $cocosTargetRoot 'engine.mjs')) -or
    -not (Test-Path -LiteralPath (Join-Path $cocosTargetRoot 'core.mjs'))) { throw 'The selected folder is not this translator extension.' }
function Get-CocosChildPath([string]$Root, [string]$Relative) {
    if ($Relative -notmatch '^[a-zA-Z0-9_./-]+$' -or $Relative.StartsWith('/') -or ($Relative.Split('/') -contains '..') -or ($Relative.Split('/') -contains '.')) { throw 'Invalid public file path.' }
    $cocosChild = [System.IO.Path]::GetFullPath((Join-Path $Root $Relative))
    if (-not $cocosChild.StartsWith($Root + '\', [System.StringComparison]::OrdinalIgnoreCase)) { throw 'Update path escaped the selected folder.' }
    $cocosAncestor = $cocosChild
    while ($cocosAncestor.Length -ge $Root.Length) {
        if (Test-Path -LiteralPath $cocosAncestor) { if ((Get-Item -LiteralPath $cocosAncestor -Force).Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Linked update paths are unsupported. Select a normal extension folder.' } }
        if ($cocosAncestor -eq $Root) { break }; $cocosAncestor = Split-Path -LiteralPath $cocosAncestor
    }
    return $cocosChild
}
$cocosPublicFiles = @($cocosMetadata.files)
function Get-CocosHash([string]$Path) {
    $cocosHasher = [System.Security.Cryptography.SHA256]::Create()
    $cocosInputStream = [System.IO.File]::OpenRead($Path)
    try { return ([System.BitConverter]::ToString($cocosHasher.ComputeHash($cocosInputStream))).Replace('-', '').ToLowerInvariant() }
    finally { $cocosInputStream.Dispose(); $cocosHasher.Dispose() }
}
if ($cocosPublicFiles.Count -lt 17 -or @($cocosPublicFiles | Where-Object path -eq 'manifest.json').Count -ne 1) { throw 'Invalid update file list.' }
foreach ($cocosFile in $cocosPublicFiles) {
    $cocosSource = Get-CocosChildPath $cocosSourceRoot $cocosFile.path
    $null = Get-CocosChildPath $cocosTargetRoot $cocosFile.path
    if (-not (Test-Path -LiteralPath $cocosSource -PathType Leaf) -or (Get-CocosHash $cocosSource) -ne $cocosFile.sha256) { throw ('Public file checksum failed: ' + $cocosFile.path) }
}
if ($cocosTargetRoot -eq $cocosSourceRoot) { Write-Output ('Files already occupy the original folder. Reload extension v' + $cocosMetadata.version + ', then refresh the game.'); exit 0 }
$cocosBackupRelative = '.cocos-update-backups/' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff')
$cocosBackupRoot = Get-CocosChildPath $cocosTargetRoot $cocosBackupRelative
$null = New-Item -ItemType Directory -Path $cocosBackupRoot -Force
foreach ($cocosFile in $cocosPublicFiles) {
    $cocosExisting = Get-CocosChildPath $cocosTargetRoot $cocosFile.path
    if (Test-Path -LiteralPath $cocosExisting -PathType Leaf) {
        $cocosBackup = Get-CocosChildPath $cocosBackupRoot $cocosFile.path
        $null = New-Item -ItemType Directory -Path (Split-Path -LiteralPath $cocosBackup) -Force
        Copy-Item -LiteralPath $cocosExisting -Destination $cocosBackup -Force
    }
}
try {
    foreach ($cocosFile in ($cocosPublicFiles | Sort-Object { $_.path -eq 'manifest.json' })) {
        $cocosDestination = Get-CocosChildPath $cocosTargetRoot $cocosFile.path
        $null = New-Item -ItemType Directory -Path (Split-Path -LiteralPath $cocosDestination) -Force
        Copy-Item -LiteralPath (Get-CocosChildPath $cocosSourceRoot $cocosFile.path) -Destination $cocosDestination -Force
    }
    if ($cocosPreviousManifest.PSObject.Properties['key']) {
        $cocosUpdatedManifest = Get-Content -LiteralPath $cocosTargetManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
        $cocosUpdatedManifest | Add-Member -MemberType NoteProperty -Name key -Value $cocosPreviousManifest.key -Force
        [System.IO.File]::WriteAllText($cocosTargetManifestPath, ($cocosUpdatedManifest | ConvertTo-Json -Depth 30), [System.Text.UTF8Encoding]::new($false))
    }
    [System.IO.File]::WriteAllText($cocosRememberedPath, (@{ targetDirectory = $cocosTargetRoot } | ConvertTo-Json), [System.Text.UTF8Encoding]::new($false))
} catch {
    foreach ($cocosFile in $cocosPublicFiles) { $cocosBackup = Get-CocosChildPath $cocosBackupRoot $cocosFile.path; if (Test-Path -LiteralPath $cocosBackup -PathType Leaf) { Copy-Item -LiteralPath $cocosBackup -Destination (Get-CocosChildPath $cocosTargetRoot $cocosFile.path) -Force } }
    throw
}
Write-Output ('Updated the SAME folder to v' + $cocosMetadata.version + '. No new extension was installed.')
Write-Output ('Previous public files backed up at: ' + $cocosBackupRoot)
Write-Output 'Reload the existing extension in Chrome/Edge (or use its Reload button), then refresh the game.'
