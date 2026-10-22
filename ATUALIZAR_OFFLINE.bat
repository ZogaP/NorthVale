@echo off
title NorthVale: Sombras de 1989 - Atualizar Versao Offline
echo ========================================================
echo   Empacotando atualizacoes no dist/NorthVale.html
echo ========================================================
echo.
node scripts/build-offline.mjs
echo.
echo ========================================================
echo   Concluido com sucesso!
echo   O arquivo dist/NorthVale.html esta 100% atualizado.
echo   Voce ja pode abrir dist/NorthVale.html no navegador!
echo ========================================================
echo.
pause
