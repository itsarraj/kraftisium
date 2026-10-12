/** @type {import('expo/config').ExpoConfig} */
module.exports = () => {
  const profile = process.env.EAS_BUILD_PROFILE ?? '';
  const isProduction = profile === 'production';
  const useLocalBff = process.env.EXPO_PUBLIC_USE_LOCAL_BFF === '1';
  const bffApiUrl =
    process.env.EXPO_PUBLIC_BFF_API_URL?.trim() || 'https://api.kraftisium.xyz';

  // EAS remote versioning (eas.json appVersionSource: remote) sets these on cloud builds.
  const version = process.env.EAS_BUILD_VERSION ?? '1.0.0';
  const androidVersionCode = process.env.EAS_BUILD_ANDROID_VERSION_CODE
    ? parseInt(process.env.EAS_BUILD_ANDROID_VERSION_CODE, 10)
    : 1;
  const iosBuildNumber = process.env.EAS_BUILD_IOS_BUILD_NUMBER ?? '1';

  return {
    name: 'Kraftisium',
    slug: 'kraftisium',
    version,
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: ['kraftisium', 'mobileappminimal', 'jobsearchwebandroidapp'],
    userInterfaceStyle: 'automatic',
    owner: 'itsarraj',
    extra: {
      bffApiUrl,
      eas: {
        projectId: '70a07986-dbd5-445b-9ee3-929c0125d4c8',
      },
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'xyz.kraftisium.jobs',
      buildNumber: iosBuildNumber,
    },
    android: {
      versionCode: androidVersionCode,
      adaptiveIcon: {
        backgroundColor: '#2b2b2b',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
      package: 'xyz.kraftisium.jobs',
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      // Store / production AAB must not ship expo-dev-client (Expo docs).
      ...(profile !== 'production' ? ['expo-dev-client'] : []),
      'expo-router',
      'expo-secure-store',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#2b2b2b',
          dark: {
            backgroundColor: '#2b2b2b',
          },
        },
      ],
      'expo-sharing',
      [
        'expo-build-properties',
        {
          android: {
            // HTTP only when explicitly using local BFF (localhost:8000)
            usesCleartextTraffic: useLocalBff && !isProduction,
          },
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};
