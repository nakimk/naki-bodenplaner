import { useCallback, useEffect, useRef, useState, type ComponentType, type RefAttributes } from 'react';
import { Alert, BackHandler, Linking, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import * as SplashScreen from 'expo-splash-screen';
import { File, Paths } from 'expo-file-system';
import html from './src/webapp';

// Workaround: Die Typen von react-native-webview (P = undefined) ergeben mit TypeScript 6 «never».
const NakiWebView = WebView as unknown as ComponentType<WebViewProps & RefAttributes<WebView<object>>>;

SplashScreen.preventAutoHideAsync().catch(() => {});

// Live-Version (GitHub Pages): Änderungen erscheinen ohne Store-Update.
// Ohne Internet wird die eingebaute Kopie (src/webapp.ts) mit derselben Herkunft geladen,
// damit «Meine Böden» (localStorage) in beiden Fällen dieselben sind.
const LIVE_URL = 'https://nakimk.github.io/naki-bodenplaner/app/';
const LIVE_ORIGIN = 'https://nakimk.github.io/';

type BridgeMessage =
  | { type: 'pick' }
  | { type: 'copy'; text: string }
  | { type: 'share'; image: string; text: string; title?: string }
  | { type: 'open'; url: string }
  | { type: 'exit' };

export default function App() {
  const web = useRef<WebView<object>>(null);
  const [offline, setOffline] = useState(false);
  const goOffline = useCallback(() => setOffline(true), []);

  const toast = useCallback((msg: string) => {
    web.current?.injectJavaScript(`try{toast(${JSON.stringify(msg)})}catch(e){};true;`);
  }, []);

  const sendImage = useCallback((result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]?.base64) return;
    const asset = result.assets[0];
    const mime = asset.mimeType && asset.mimeType.startsWith('image/') && asset.mimeType !== 'image/heic' ? asset.mimeType : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${asset.base64}`;
    web.current?.injectJavaScript(`window.nakiLoadImage(${JSON.stringify(dataUrl)});true;`);
  }, []);

  const pickImage = useCallback(() => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      exif: false,
    };
    const fromCamera = async () => {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Kamera nicht erlaubt', 'Bitte erlaube den Kamerazugriff in den Einstellungen, um deinen Raum zu fotografieren.', [
          { text: 'Abbrechen', style: 'cancel' },
          { text: 'Einstellungen', onPress: () => Linking.openSettings() },
        ]);
        return;
      }
      sendImage(await ImagePicker.launchCameraAsync(options));
    };
    const fromLibrary = async () => {
      sendImage(await ImagePicker.launchImageLibraryAsync(options));
    };
    Alert.alert('Raumfoto', 'Wie möchtest du dein Foto hinzufügen?', [
      { text: 'Foto aufnehmen', onPress: () => void fromCamera().catch(() => toast('Kamera konnte nicht geöffnet werden')) },
      { text: 'Aus Galerie wählen', onPress: () => void fromLibrary().catch(() => toast('Galerie konnte nicht geöffnet werden')) },
      { text: 'Abbrechen', style: 'cancel' },
    ]);
  }, [sendImage, toast]);

  const shareImage = useCallback(
    async (image: string, text: string, title?: string) => {
      const match = /^data:(image\/[a-z]+);base64,(.+)$/.exec(image);
      if (!match) return;
      const ext = match[1] === 'image/png' ? 'png' : 'jpg';
      const file = new File(Paths.cache, `naki-boden-${Date.now()}.${ext}`);
      await file.write(match[2], { encoding: 'base64' });
      // Beschreibung zusätzlich in die Zwischenablage (Bild + Text lassen sich nicht überall gemeinsam teilen)
      await Clipboard.setStringAsync(text);
      if (await Sharing.isAvailableAsync()) {
        toast('Beschreibung kopiert – beim Teilen einfügen');
        await Sharing.shareAsync(file.uri, { mimeType: match[1], dialogTitle: title ?? 'Bodenvorschau teilen', UTI: ext === 'png' ? 'public.png' : 'public.jpeg' });
      } else {
        toast('Teilen ist auf diesem Gerät nicht verfügbar');
      }
    },
    [toast]
  );

  // Android-Zurücktaste: die Web-App entscheidet (Fenster → Startseite → App schliessen)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      web.current?.injectJavaScript(
        "(window.nakiBack?window.nakiBack():window.ReactNativeWebView.postMessage('{\"type\":\"exit\"}'));true;"
      );
      return true;
    });
    return () => sub.remove();
  }, []);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: BridgeMessage;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return;
      }
      switch (msg.type) {
        case 'pick':
          pickImage();
          break;
        case 'copy':
          void Clipboard.setStringAsync(msg.text);
          break;
        case 'share':
          void shareImage(msg.image, msg.text, msg.title).catch(() => toast('Teilen fehlgeschlagen'));
          break;
        case 'exit':
          BackHandler.exitApp();
          break;
        case 'open':
          void Linking.openURL(msg.url).catch(() => toast('Link konnte nicht geöffnet werden'));
          break;
      }
    },
    [pickImage, shareImage, toast]
  );

  // Externe Links (nakigmbh.ch, mailto:, tel:) im Browser bzw. in der passenden App öffnen
  const onShouldStart = useCallback((req: ShouldStartLoadRequest) => {
    const url = req.url;
    if (url.startsWith(LIVE_ORIGIN) || url.startsWith('about:') || url.startsWith('data:') || url.startsWith('blob:')) return true;
    if (/^(https?:|mailto:|tel:)/.test(url)) {
      void Linking.openURL(url).catch(() => {});
      return false;
    }
    return true;
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <NakiWebView
          ref={web}
          style={styles.web}
          key={offline ? 'offline' : 'live'}
          source={offline ? { html, baseUrl: LIVE_URL } : { uri: LIVE_URL }}
          onError={goOffline}
          onHttpError={(e) => {
            if (e.nativeEvent.statusCode >= 400) goOffline();
          }}
          cacheEnabled
          cacheMode="LOAD_DEFAULT"
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          bounces={false}
          overScrollMode="never"
          textZoom={100}
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStart}
          onLoadEnd={() => {
            SplashScreen.hideAsync().catch(() => {});
          }}
          webviewDebuggingEnabled={__DEV__}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fffdf9' },
  web: { flex: 1, backgroundColor: '#f5f1ea' },
});
