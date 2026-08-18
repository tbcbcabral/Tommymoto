# Tommymoto 🏍️

[![Live Demo](https://img.shields.io/badge/Live-Demo-208AEF?style=for-the-badge&logo=github)](https://tbcbcabral.github.io/Tommymoto/)

Tommymoto is a sleek, local-first garage management and vehicle tracking application built with **Expo (React Native)**, **PowerSync**, and **Supabase**. It helps you keep track of all your vehicles, their refueling history, and maintenance logs—all instantly accessible from any device.

## ✨ Features

- **Virtual Garage**: Add all your vehicles (cars, motorcycles, etc.) with custom profile photos, license plates (strictly formatted), and nicknames.
- **Refueling Logs**: Track your fuel consumption, total price paid, and odometer readings. Includes a "Full Tank" toggle to help calculate average L/100km statistics.
- **Maintenance Tracking**: Log your garage visits, odometer readings, and (coming soon) attach photo receipts for every service item.
- **Vehicle Archiving**: Safely hide vehicles from your main garage without permanently destroying their historical data. 
- **Cloud Syncing**: Powered by Supabase, your data is securely stored in the cloud so you can access your garage from your phone, tablet, or PC browser.
- **Instant Backups**: Export a complete JSON backup of your entire database directly from the app dashboard with a single tap.

## 🚀 Tech Stack

- **Framework**: [Expo](https://expo.dev/) (React Native) + Expo Router
- **UI Components**: [React Native Paper](https://callstack.github.io/react-native-paper/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: Vanilla Stylesheets + Expo Router ThemeProvider

## 🛠️ Getting Started

### Prerequisites
1. Node.js installed on your machine.
2. An active Supabase project.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/tbcbcabral/Tommymoto.git
   cd Tommymoto
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Supabase Setup
You need to create the required tables in your Supabase project.
1. Open your Supabase Dashboard -> SQL Editor.
2. Run the schema found in the project's documentation to create the `vehicles`, `refueling_events`, and `maintenance_events` tables.
3. Replace the `supabaseUrl` and `supabaseAnonKey` in `src/lib/supabase.ts` with your own project credentials.

### Running the App
Start the Expo development server:
```bash
npx expo start
```
- Press `a` to open in an Android Emulator.
- Press `i` to open in an iOS Simulator.
- Press `w` to run the app in your Web Browser.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/tbcbcabral/Tommymoto/issues).

## 📝 License
This project is licensed under the MIT License.
