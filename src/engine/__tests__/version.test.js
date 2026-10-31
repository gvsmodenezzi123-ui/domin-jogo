import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (file) => readFileSync(join(root, file), 'utf8');

/** Um projeto Android como o que o `npx cap add android` gera (só o que o script mexe). */
function fakeProject(appId) {
  const dir = mkdtempSync(join(tmpdir(), 'bux-android-'));
  cpSync(join(root, 'scripts'), join(dir, 'scripts'), { recursive: true });
  cpSync(join(root, 'android-extras'), join(dir, 'android-extras'), { recursive: true });
  writeFileSync(join(dir, 'package.json'), read('package.json'));
  writeFileSync(join(dir, 'capacitor.config.json'), JSON.stringify({ appId, appName: 'Buxaria', webDir: 'dist' }));
  const pkgDir = join(dir, 'android/app/src/main/java', ...appId.split('.'));
  mkdirSync(pkgDir, { recursive: true });
  writeFileSync(join(pkgDir, 'MainActivity.java'), `package ${appId};\npublic class MainActivity {}\n`);
  writeFileSync(
    join(dir, 'android/app/src/main/AndroidManifest.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:theme="@style/AppTheme">

        <activity
            android:name=".MainActivity"
            android:exported="true">
        </activity>
    </application>

    <!-- Permissions -->

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
</manifest>
`,
  );
  writeFileSync(join(dir, 'android/app/build.gradle'), 'android {\n    defaultConfig {\n        versionCode = 1\n        versionName = "1.0"\n    }\n}\n');
  writeFileSync(join(dir, 'android/variables.gradle'), 'ext {\n    minSdkVersion = 24\n    compileSdkVersion = 36\n    targetSdkVersion = 36\n}\n');
  return dir;
}

// o Node que roda os testes (via globalThis: o lint de src/ só conhece os globais do navegador)
const node = globalThis.process;
const run = (dir, env) => spawnSync(node.execPath, ['scripts/prepare-android.mjs'], { cwd: dir, env: { ...node.env, ...env }, encoding: 'utf8' });

describe('Versão 1.5: build de produção do Android', () => {
  it('versão 1.5.0 e o pacote oficial no Capacitor', () => {
    expect(JSON.parse(read('package.json')).version).toBe('1.5.0');
    const cap = JSON.parse(read('capacitor.config.json'));
    expect(cap).toMatchObject({ appId: 'com.buxaria.game', appName: 'Buxaria', webDir: 'dist' });
    expect(read('public/sw.js')).toContain("'buxaria-v1.5.0'");
  });

  it('o workflow do App Bundle: manual e na main, bundleRelease, assinatura pelos 4 segredos, .aab no Actions', () => {
    const wf = read('.github/workflows/build-android.yml');
    expect(wf).toContain('workflow_dispatch:');
    expect(wf).toContain('branches: [main]');
    expect(wf).toContain('npm ci');
    expect(wf).toContain('npm run build');
    expect(wf).toContain('npx cap sync android');
    expect(wf).toContain('./gradlew bundleRelease');
    for (const secret of ['ANDROID_KEYSTORE_BASE64', 'ANDROID_KEY_ALIAS', 'ANDROID_KEYSTORE_PASSWORD', 'ANDROID_KEY_PASSWORD']) expect(wf).toContain(`secrets.${secret}`);
    expect(wf).toContain('jarsigner -verify "$AAB"');
    expect(wf).toContain('grep -q "jar verified"');
    expect(wf).toContain('path: out/app-release.aab');
    expect(wf).toContain('@capacitor/android@8');
    expect(wf).toContain('java-version: 21');
    // nunca a chave de teste do repositório
    expect(wf).not.toContain('debug.keystore');
  });

  it('os APKs de teste ficam na chave fixa e no mesmo Capacitor do .aab', () => {
    const apk = read('.github/workflows/android-apk.yml');
    expect(apk).not.toContain('secrets.ANDROID');
    expect(apk).toContain('@capacitor/android@8');
    expect(apk).toContain('com.buxaria.domino');
    expect(apk).toContain('SIGN_WITH_GRADLE=1 node scripts/prepare-android.mjs');
  });

  it('prepare-android: só INTERNET e VIBRATE, o resto removido, retrato, versão e MainActivity', () => {
    const dir = fakeProject('com.buxaria.game');
    try {
      const out = run(dir, { VERSION_CODE: '42' });
      expect(out.status, out.stderr).toBe(0);
      const manifest = readFileSync(join(dir, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
      const kept = [...manifest.matchAll(/<uses-permission android:name="([^"]+)" \/>/g)].map((m) => m[1]);
      expect(kept).toEqual(['android.permission.INTERNET', 'android.permission.VIBRATE']);
      expect(manifest).toContain('<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />');
      expect(manifest).toContain('<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" tools:node="remove" />');
      expect(manifest).toContain('xmlns:tools="http://schemas.android.com/tools"');
      expect(manifest).toContain('android:screenOrientation="portrait"');
      expect(manifest).toContain('PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY');
      const gradle = readFileSync(join(dir, 'android/app/build.gradle'), 'utf8');
      expect(gradle).toContain('versionCode = 42');
      expect(gradle).toContain('versionName = "1.5.0"');
      expect(gradle).not.toContain('signingConfigs');
      const activity = readFileSync(join(dir, 'android/app/src/main/java/com/buxaria/game/MainActivity.java'), 'utf8');
      expect(activity.startsWith('package com.buxaria.game;')).toBe(true);
      expect(activity).toContain('extends BridgeActivity');
      // Patch 1.1: o som da abertura toca sem esperar um toque
      expect(activity).toContain('setMediaPlaybackRequiresUserGesture(false)');
      // rodar de novo não duplica nada; o APK pede a assinatura no Gradle
      expect(run(dir, { VERSION_CODE: '43', SIGN_WITH_GRADLE: '1' }).status).toBe(0);
      const again = readFileSync(join(dir, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
      expect(again.match(/uses-permission/g).length).toBe(manifest.match(/uses-permission/g).length);
      expect(readFileSync(join(dir, 'android/app/build.gradle'), 'utf8')).toContain('signingConfigs.buxaria');
      // versionCode inválido para o build
      expect(run(dir, { VERSION_CODE: 'abc' }).status).not.toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
