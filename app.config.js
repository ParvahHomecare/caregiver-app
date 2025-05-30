import 'dotenv/config';

export default {
  expo: {
    name: 'Parvah Caregiver',
    slug: 'caregiver-app',
    owner: 'parvahhealthcare',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/logo.png',
    scheme: 'myapp',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.parvahhealthcare.caregiver'
    },
    android: {
      package: 'com.parvahhealthcare.caregiver',
      versionCode: 2 
    },
    web: {
      bundler: 'metro',
      output: 'server',
      favicon: './assets/images/favicon.png'
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: 'f5d4e994-69d6-4563-b427-5df60af1ceec'
      }
    },
  }
};