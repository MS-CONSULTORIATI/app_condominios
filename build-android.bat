@echo off
echo === Limpando cache e diretórios antigos ===
rmdir /s /q android 2>nul
rmdir /s /q .expo 2>nul
rmdir /s /q %TEMP%\.gradle 2>nul

echo === Instalando dependências ===
call npm install

echo === Corrigindo plugins do Expo ===
node fix-expo-plugins.js

echo === Executando prebuild do Expo ===
call npx expo prebuild -p android --clean

echo === Configurando variáveis de ambiente ===
set JAVA_HOME=%ProgramFiles%\Java\jdk-17
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%JAVA_HOME%\bin;%PATH%

echo === Construindo APK ===
cd android
call gradlew.bat clean
call gradlew.bat assembleRelease --no-daemon --warning-mode all --stacktrace

echo === Build concluído ===
echo Verifique o APK em: android\app\build\outputs\apk\release\app-release.apk

pause 