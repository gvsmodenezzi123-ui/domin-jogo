// Ajusta o projeto Android que o Capacitor gera no CI (`npx cap add android`), usado pelos
// dois workflows: o APK de teste (.github/workflows/android-apk.yml) e o App Bundle da Play
// Store (.github/workflows/build-android.yml). Roda depois do `cap add` e antes do `cap sync`.
//
//   - MainActivity: tela cheia e o VOLTAR que manda o jogo para o fundo (android-extras/)
//   - AndroidManifest: retrato (também em tela grande no Android 16), só as permissões que o
//     jogo usa (INTERNET para o WebView do Capacitor, VIBRATE para a vibração) e remoção
//     explícita das que alguma biblioteca possa enfiar (ID de publicidade, rede, câmera...)
//   - build.gradle: versionCode/versionName e, no APK, a assinatura lida do ambiente
//
// Ambiente: VERSION_CODE (obrigatório), VERSION_NAME (padrão: package.json),
// SIGN_WITH_GRADLE=1 (APK: o Gradle assina com BUXARIA_KEYSTORE/BUXARIA_KS_PASS/BUXARIA_KS_ALIAS
// e BUXARIA_KEY_PASS, que cai na senha do keystore se faltar).
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};

const config = JSON.parse(readFileSync(join(root, 'capacitor.config.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const appId = config.appId;
const versionCode = Number(process.env.VERSION_CODE);
const versionName = process.env.VERSION_NAME || pkg.version;
if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/.test(appId ?? '')) fail(`appId inválido no capacitor.config.json: ${appId}`);
if (!Number.isInteger(versionCode) || versionCode < 1 || versionCode > 2100000000) fail(`VERSION_CODE inválido: ${process.env.VERSION_CODE}`);

const android = join(root, 'android');
if (!existsSync(android)) fail('Pasta android/ não existe: rode `npx cap add android` antes.');

// --- MainActivity -----------------------------------------------------------
function find(dir, name) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      const hit = find(path, name);
      if (hit) return hit;
    } else if (entry === name) return path;
  }
  return null;
}
const activity = find(join(android, 'app/src/main/java'), 'MainActivity.java');
if (!activity) fail('MainActivity.java não encontrada no projeto gerado.');
writeFileSync(activity, readFileSync(join(root, 'android-extras/MainActivity.java'), 'utf8').replace('__PACKAGE__', appId));

// --- AndroidManifest ----------------------------------------------------------
const manifestPath = join(android, 'app/src/main/AndroidManifest.xml');
let manifest = readFileSync(manifestPath, 'utf8');
if (!manifest.includes('xmlns:tools=')) manifest = manifest.replace('<manifest ', '<manifest xmlns:tools="http://schemas.android.com/tools" ');
if (!manifest.includes('android:screenOrientation')) {
  manifest = manifest.replace('android:name=".MainActivity"', 'android:name=".MainActivity" android:screenOrientation="portrait"');
}
// Android 16 ignora a trava de orientação em tela grande; esta propriedade mantém o retrato
const RESIZE = 'android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY';
if (!manifest.includes(RESIZE)) {
  manifest = manifest.replace(/(<application\b[^>]*>)/, `$1\n        <property android:name="${RESIZE}" android:value="true" />`);
}
// permissões: só as que o jogo usa, e a remoção explícita do resto
const KEEP = ['android.permission.INTERNET', 'android.permission.VIBRATE'];
const REMOVE = [
  'com.google.android.gms.permission.AD_ID',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.WAKE_LOCK',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.CAMERA',
  'android.permission.RECORD_AUDIO',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_BACKGROUND_LOCATION',
  'android.permission.READ_CONTACTS',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.READ_MEDIA_IMAGES',
  'android.permission.READ_MEDIA_VIDEO',
  'android.permission.READ_MEDIA_AUDIO',
];
manifest = manifest.replace(/[ \t]*<!--\s*Permissions\s*-->\s*\n/gi, '').replace(/[ \t]*<uses-permission\b[^>]*\/>\s*\n?/g, '');
const block = [
  '    <!-- Buxaria: só o que o jogo usa (scripts/prepare-android.mjs) -->',
  ...KEEP.map((p) => `    <uses-permission android:name="${p}" />`),
  ...REMOVE.map((p) => `    <uses-permission android:name="${p}" tools:node="remove" />`),
  '',
].join('\n');
manifest = manifest.replace(/(\n[ \t]*<application\b)/, `\n${block}$1`);
writeFileSync(manifestPath, manifest);

// --- build.gradle ---------------------------------------------------------------
const gradlePath = join(android, 'app/build.gradle');
let gradle = readFileSync(gradlePath, 'utf8');
if (!/versionCode\s*=?\s*\d+/.test(gradle) || !/versionName\s*=?\s*"[^"]*"/.test(gradle)) fail('versionCode/versionName não encontrados no app/build.gradle.');
gradle = gradle
  .replace(/versionCode(\s*=?\s*)\d+/, `versionCode$1${versionCode}`)
  .replace(/versionName(\s*=?\s*)"[^"]*"/, `versionName$1"${versionName}"`);
if (process.env.SIGN_WITH_GRADLE === '1' && !gradle.includes('signingConfigs.buxaria')) {
  gradle += `
// Buxaria: o APK sai assinado com a chave que o workflow passa no ambiente
android {
    signingConfigs {
        buxaria {
            storeFile file(System.getenv("BUXARIA_KEYSTORE"))
            storePassword System.getenv("BUXARIA_KS_PASS")
            keyAlias System.getenv("BUXARIA_KS_ALIAS")
            keyPassword System.getenv("BUXARIA_KEY_PASS") ?: System.getenv("BUXARIA_KS_PASS")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.buxaria
        }
    }
}
`;
}
writeFileSync(gradlePath, gradle);

// --- resumo -----------------------------------------------------------------------
const variables = existsSync(join(android, 'variables.gradle')) ? readFileSync(join(android, 'variables.gradle'), 'utf8') : '';
const sdk = (name) => variables.match(new RegExp(`${name}\\s*=\\s*(\\d+)`))?.[1] ?? '?';
console.log(`appId ${appId} · versionName ${versionName} · versionCode ${versionCode}`);
console.log(`minSdk ${sdk('minSdkVersion')} · compileSdk ${sdk('compileSdkVersion')} · targetSdk ${sdk('targetSdkVersion')}`);
console.log(`permissões: ${KEEP.join(', ')} (${REMOVE.length} removidas explicitamente)`);
console.log(`assinatura no Gradle: ${process.env.SIGN_WITH_GRADLE === '1' ? 'sim (APK)' : 'não (o .aab é assinado depois, com jarsigner)'}`);
