@echo off
echo ==========================================
echo       CONSTRUINDO APP PARA iOS
echo ==========================================
echo.

echo [1] Preparando ambiente...
call npm install

echo.
echo [2] Gerando build iOS via EAS...
echo.
echo Selecione o tipo de build:
echo [1] - Build de Produção (App Store)
echo [2] - Build de Preview (TestFlight)
echo [3] - Build de Desenvolvimento
echo [4] - Build para Simulador

set /p opcao="Escolha uma opção (1-4): "

if "%opcao%"=="1" (
    echo.
    echo Iniciando build de produção...
    call npm run build:ios:eas
) else if "%opcao%"=="2" (
    echo.
    echo Iniciando build de preview...
    call npm run build:ios:eas
) else if "%opcao%"=="3" (
    echo.
    echo Iniciando build de desenvolvimento...
    call npm run build:ios:eas:dev
) else if "%opcao%"=="4" (
    echo.
    echo Iniciando build para simulador...
    call npm run build:ios:simulator
) else (
    echo.
    echo Opção inválida. Saindo...
    exit /b 1
)

echo.
echo Build concluído! Verifique o console para mais detalhes.
echo. 