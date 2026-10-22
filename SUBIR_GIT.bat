@echo off
setlocal enabledelayedexpansion
title NorthVale: Sombras de 1989 - Subir para o Git
echo ========================================================
echo   NorthVale: Sombras de 1989 - Enviar para o GitHub
echo ========================================================
echo.

:: 1. Verificar se o Git esta instalado
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERRO] O Git nao foi encontrado no seu sistema.
    echo Por favor, instale o Git (https://git-scm.com/) e tente novamente.
    echo.
    pause
    exit /b 1
)

:: 2. Inicializar se necessario
if not exist ".git" (
    echo [1/5] Inicializando repositorio Git local...
    git init
    git branch -M main
) else (
    echo [1/5] Repositorio Git local ja inicializado.
)

:: 3. Configurar remote origin se ainda nao existir
echo [2/5] Verificando remote origin...
git remote get-url origin >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Configurando remote origin para: https://github.com/ZogaP/NorthVale.git
    git remote add origin https://github.com/ZogaP/NorthVale.git
) else (
    echo Remote origin configurado:
    git remote -v
)

:: 4. Adicionar arquivos
echo.
echo [3/5] Adicionando arquivos (git add .)...
git add .

:: 5. Mensagem de commit
echo.
set /p COMMIT_MSG="Digite a mensagem do commit (ou ENTER para 'Atualizacao NorthVale'): "
if "!COMMIT_MSG!"=="" set COMMIT_MSG=Atualizacao NorthVale

echo.
echo [4/5] Criando commit...
git commit -m "!COMMIT_MSG!"

:: 6. Push
echo.
echo [5/5] Enviando para o GitHub (main)...
git push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================================
    echo   SUCESSO! Projeto enviado para o GitHub com exito!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo   [AVISO] Nao foi possivel concluir o git push automaticamente.
    echo   Possiveis razoes:
    echo   1. Se o repositorio remoto ja tem commits, tente rodar:
    echo      git pull origin main --rebase
    echo      e execute este script novamente.
    echo   2. Autenticacao: caso seja solicitado login ou token do GitHub.
    echo ========================================================
)

echo.
pause
