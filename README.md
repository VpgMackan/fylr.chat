Here is a small script to fetch the content from src folder.

```powershell
Clear-Content -Path content.txt -ErrorAction SilentlyContinue; Get-ChildItem -Path .\src -Recurse -File | ForEach-Object -Begin { $first = $true } -Process { if (-not $first) { Add-Content -Path content.txt -Value "`n---" }; $relativePath = $_.FullName.Substring($PWD.Path.Length).TrimStart('\').TrimStart('/'); $headerPath = $relativePath.Replace('\', '/'); Add-Content -Path content.txt -Value "# ./$headerPath`n"; Add-Content -Path content.txt -Value (Get-Content -Path $_.FullName -Raw -Encoding UTF8 -ErrorAction SilentlyContinue); $first = $false }; Write-Host "Generated content.txt"
```