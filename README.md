# Condomínio Santa Cecília

## Configuração de Notificações Push

Para que as notificações push funcionem corretamente, você precisa configurar o Firebase Cloud Messaging (FCM) no projeto.

### Como obter a chave do FCM Server:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/) e selecione seu projeto "condominio-santacecilia"

2. No menu lateral, vá para "Project settings" (Configurações do projeto)

3. Navegue até a aba "Cloud Messaging"

4. Aqui você encontrará a "Server key" (Chave do servidor) na seção "Project credentials" (Credenciais do projeto)

5. Copie essa chave e use-a no aplicativo para enviar notificações push

### Implantando as Cloud Functions

Para que as notificações push sejam enviadas quando uma nova notificação for criada no Firestore, você precisa implantar as Cloud Functions:

1. Certifique-se de ter o Firebase CLI instalado:
   ```
   npm install -g firebase-tools
   ```

2. Faça login no Firebase:
   ```
   firebase login
   ```

3. Navegue até a pasta `functions` e instale as dependências:
   ```
   cd functions
   npm install
   ```

4. Implante as funções:
   ```
   npm run deploy
   ```

5. Após a implantação, verifique no console do Firebase se as funções foram implantadas com sucesso.

### Configuração no Expo EAS:

Se você estiver usando o Expo EAS (Expo Application Services):

1. Configure sua conta EAS com `eas login`

2. Configure o FCM para Android:
   - Na pasta `android/app/src/`, verifique se o arquivo `google-services.json` já foi copiado
   - Caso não exista, baixe o arquivo do Firebase Console e coloque-o na raiz do projeto
   - Execute `eas build` para compilar o aplicativo com suporte a FCM

3. Configure o FCM para iOS:
   - Baixe o arquivo `GoogleService-Info.plist` do Firebase Console
   - Coloque-o na raiz do seu projeto
   - Execute `eas credentials` para configurar as credenciais do iOS
   - Execute `eas build` para compilar o aplicativo iOS com suporte a FCM

### Atualizando app.json

No arquivo `app.json`, atualize o campo `projectId` em `extra.eas` com o ID do seu projeto EAS:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "seu-project-id-aqui" // Substitua com seu Project ID do EAS
      }
    }
  }
}
```

Para encontrar seu Project ID do EAS, execute `eas project:list` ou acesse o [Expo Dashboard](https://expo.dev).

### Testando as notificações push

Para testar se o sistema de notificações push está funcionando:

1. Implante o aplicativo em seu dispositivo usando o Expo:
   ```
   eas build --profile development --platform android
   ```
   ou 
   ```
   eas build --profile development --platform ios
   ```

2. Após instalar o aplicativo, faça login e navegue pelo app para registrar o token do dispositivo

3. Crie uma nova pauta para testar as notificações push

4. Você também pode usar a função HTTP `testPushNotification` para enviar uma notificação de teste:
   ```
   curl -X POST https://us-central1-condominio-santacecilia.cloudfunctions.net/testPushNotification \
     -H "Content-Type: application/json" \
     -d '{"title":"Teste de Notificação","message":"Esta é uma notificação de teste","tokens":["ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"]}'
   ```
   
   Substitua o token pelo token real do seu dispositivo, que você pode ver nos logs do aplicativo. 

## Gerando uma Versão para iOS

Para gerar uma versão do aplicativo para iOS, siga os passos abaixo:

### Pré-requisitos

1. Conta Apple Developer ($99/ano) - necessária para publicar na App Store
2. Configuração de certificados e perfis de provisionamento no Apple Developer Portal
3. Expo Application Services (EAS) configurado (`eas login`)

### Configuração do EAS.json

O arquivo `eas.json` já contém a configuração para builds iOS, mas você precisa personalizar os seguintes campos:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "SEU_APPLE_ID",
      "ascAppId": "ID_DO_APP_NA_APP_STORE_CONNECT",
      "appleTeamId": "ID_DA_EQUIPE_APPLE"
    }
  }
}
```

- `appleId`: Seu email da Apple ID
- `ascAppId`: ID do seu aplicativo na App Store Connect
- `appleTeamId`: ID da sua equipe de desenvolvimento Apple

### Métodos para Build do iOS

#### 1. Usando o Script Automatizado

Execute o script `build-ios.bat` e selecione uma das opções disponíveis:

```
build-ios.bat
```

O script oferece as seguintes opções:
- Build de Produção (App Store)
- Build de Preview (TestFlight)
- Build de Desenvolvimento
- Build para Simulador

#### 2. Usando Comandos NPM

Você pode usar diretamente os comandos NPM configurados:

```bash
# Para build de preview (TestFlight)
npm run build:ios:eas

# Para build de desenvolvimento
npm run build:ios:eas:dev

# Para build de debug
npm run build:ios:eas:debug

# Para build direcionado ao simulador iOS
npm run build:ios:simulator
```

#### 3. Usando EAS CLI Diretamente

```bash
# Build para TestFlight
npx eas build --platform ios --profile preview

# Build de desenvolvimento
npx eas build --platform ios --profile development

# Build para simulador
npx eas build --platform ios --profile debug
```

### Notas Importantes

- **Build na Nuvem**: O EAS realiza os builds na nuvem, então você não precisa de um Mac para gerar o aplicativo iOS
- **Tempo de Build**: O processo de build pode levar de 10 a 30 minutos
- **TestFlight**: Para distribuir seu app via TestFlight, o build precisa ser aprovado pela Apple (revisão de 1-2 dias)
- **App Store**: Para publicar na App Store, use o comando `eas submit -p ios` após o build

### Solução de Problemas

Se encontrar erros durante o build:

1. Verifique se as credenciais da Apple estão corretas
2. Certifique-se de que o Bundle ID é único (`br.com.condominio.cecilia` no `app.json`)
3. Verifique se o App ID está registrado no Apple Developer Portal
4. Se os erros persistirem, consulte os logs detalhados no dashboard do EAS

# Corrigir erros de dependências
   npx expo install --fix

# Iniciar o projeto modo desenvolvedor

   expo start --dev-client
   eas build --profile development --platform android
   eas build --profile development --platform ios
   

    npx expo build:android -t apk

  cd android -  gradlew assembleRelease




  # PodFile

  require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")
require File.join(File.dirname(`node --print "require.resolve('react-native/package.json')"`), "scripts/react_native_pods")

platform :ios, '15.1'
use_modular_headers!
install! 'cocoapods', :deterministic_uuids => false

target 'CondomnioSantaCeclia' do
  use_expo_modules!
  pod 'expo-dev-client', path: '../node_modules/expo-dev-client/ios', :configurations => :debug
  pod 'expo-dev-launcher', path: '../node_modules/expo-dev-launcher', :configurations => :debug
  pod 'expo-dev-menu', path: '../node_modules/expo-dev-menu', :configurations => :debug
  pod 'RNCPicker', :path => '../node_modules/@react-native-picker/picker'
  pod 'RNDateTimePicker', :path => '../node_modules/@react-native-community/datetimepicker'
  pod 'RNReanimated', :path => '../node_modules/react-native-reanimated'
  pod 'RNGestureHandler', :path => '../node_modules/react-native-gesture-handler'
  pod 'react-native-safe-area-context', :path => '../node_modules/react-native-safe-area-context'
  pod 'RNFBApp', :path => '../node_modules/@react-native-firebase/app'
  pod 'RNFBMessaging', :path => '../node_modules/@react-native-firebase/messaging'
  pod 'RNCAsyncStorage', :path => '../node_modules/@react-native-async-storage/async-storage'
  pod 'RNScreens', :path => '../node_modules/react-native-screens'
  pod 'RNSVG', :path => '../node_modules/react-native-svg'

  use_frameworks! :linkage => :static
  $RNFirebaseAsStaticFramework = true
  $FirebaseSDKVersion = '10.19.0'

  use_react_native!(
    :path => "../node_modules/react-native",
    :hermes_enabled => true,
    :fabric_enabled => false,
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      "../node_modules/react-native",
      :mac_catalyst_enabled => false
    )

    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        config.build_settings['SWIFT_VERSION'] = '5.0'
        config.build_settings['ENABLE_BITCODE'] = 'NO'
        config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
        config.build_settings['VALID_ARCHS[sdk=iphonesimulator*]'] = 'x86_64'
        config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
        config.build_settings['EXCLUDED_ARCHS[sdk=iphoneos*]'] = 'armv7'
        config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'

        # Adicione esta linha para resolver problemas de linking
        config.build_settings['OTHER_LDFLAGS'] = '-ObjC'
      end
    end

    installer.pods_project.build_configurations.each do |config|
      config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
      config.build_settings['VALID_ARCHS[sdk=iphonesimulator*]'] = 'x86_64'
    end
  end
end