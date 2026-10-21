# ReadyPath

ReadyPath is an offline-first emergency-preparedness app for families. It helps kids, grandparents, and parents use a shared household plan during emergencies.

## What the app does

- Provides Kid, Grandparent, and Parent modes, with English and Spanish text.
- Stores household members, emergency contacts, medical details, and plan notes on the device.
- Offers readiness checks, emergency-call guidance, and nearby shelter and route information.
- Answers questions using the matching notes from the family plan. If an on-device AI model is installed, it can phrase those notes; without a model, the app still shows the relevant plan text.
- Checks danger rules before using AI and blocks answers with numbers that are not in the selected plan notes.
- Includes a Texas demo family so you can try the app without entering your own information.

Household data is stored locally on the device. The app does not require an internet connection at runtime. An internet connection is needed to install dependencies the first time.

## Run locally on Android

You need Node.js with npm, Android Studio with the Android SDK, and an Android phone with USB debugging or an Android emulator. This project uses native modules, so Expo Go is not supported.

From the project folder:

```bash
cd app
npm install
npm run android
```

The Android command synchronizes the shared JSON data, builds and launches the development app, and attempts to copy an optional local AI model if one is available. The model is not required to try the app.

When ReadyPath opens, tap **Load Texas Demo Family** on the home screen. The demo plan includes example household information, contacts, emergency notes, and local shelter data. You can also load it later from Parent mode.

To use an AI model, add the supported Gemma `.gguf` file to the app through **Parent → AI helper → Choose AI model file**. Without an installed model, the app still works using plan text and its safety rules.

## Checks

Run these from the `app` directory:

```bash
npm test
npm run typecheck
npm run eval
```

The app project details and component map are in [app/README.md](./app/README.md). The starter household and other shared data live in [data/](./data/).
